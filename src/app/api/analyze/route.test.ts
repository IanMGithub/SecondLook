import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeErrorSchema } from "../../../lib/contract";
import { POST } from "./route";

const url = "http://localhost/api/analyze";
const secret = "submitted-secret-phrase";

function postJson(body: unknown, contentType = "application/json") {
  return POST(
    new Request(url, {
      method: "POST",
      headers: { "content-type": contentType },
      body: JSON.stringify(body),
    }),
  );
}

async function read(response: Response) {
  const text = await response.text();
  return {
    status: response.status,
    cacheControl: response.headers.get("cache-control"),
    text,
    body: JSON.parse(text) as unknown,
  };
}

describe("POST /api/analyze", () => {
  it("accepts application/json and returns the 503 placeholder", async () => {
    const result = await read(await postJson({ message: `  ${secret}  ` }));
    assert.equal(result.status, 503);
    assert.equal(result.cacheControl, "no-store");
    assert.deepEqual(result.body, {
      ok: false,
      error: {
        code: "ANALYSIS_UNAVAILABLE",
        message: "Live analysis is not connected yet.",
      },
    });
    assert.equal(analyzeErrorSchema.safeParse(result.body).success, true);
    assert.equal(result.text.includes(secret), false);
  });

  it("accepts a JSON media type with charset=utf-8", async () => {
    const result = await read(
      await postJson({ message: "Hello" }, "application/json; charset=utf-8"),
    );
    assert.equal(result.status, 503);
    assert.equal(result.cacheControl, "no-store");
  });

  it("returns 415 when the content type is missing", async () => {
    const response = await POST(
      new Request(url, {
        method: "POST",
        body: new Uint8Array(Buffer.from(JSON.stringify({ message: secret }))),
      }),
    );
    const result = await read(response);
    assert.equal(result.status, 415);
    assert.equal(result.cacheControl, "no-store");
    assert.deepEqual(result.body, {
      ok: false,
      error: {
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "Content-Type must be application/json.",
      },
    });
    assert.equal(result.text.includes(secret), false);
  });

  it("returns 415 for an unsupported content type", async () => {
    const response = await POST(
      new Request(url, {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: JSON.stringify({ message: secret }),
      }),
    );
    const result = await read(response);
    assert.equal(result.status, 415);
    assert.equal(result.cacheControl, "no-store");
    assert.equal(result.text.includes(secret), false);
  });

  it("returns 400 for malformed JSON without echoing the body", async () => {
    const response = await POST(
      new Request(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: `{"message":"${secret}"`,
      }),
    );
    const result = await read(response);
    assert.equal(result.status, 400);
    assert.equal(result.cacheControl, "no-store");
    assert.deepEqual(result.body, {
      ok: false,
      error: {
        code: "INVALID_JSON",
        message: "Request body must be valid JSON.",
      },
    });
    assert.equal(result.text.includes(secret), false);
  });

  it("returns 400 for an invalid request shape", async () => {
    const result = await read(await postJson({ message: secret, extra: true }));
    assert.equal(result.status, 400);
    assert.equal(result.cacheControl, "no-store");
    assert.deepEqual(result.body, {
      ok: false,
      error: {
        code: "INVALID_REQUEST",
        message: "Request must be an object with only a message string.",
      },
    });
    assert.equal(result.text.includes(secret), false);
  });

  it("returns 400 for an empty or whitespace-only message", async () => {
    for (const message of ["", " \n\t "]) {
      const result = await read(await postJson({ message }));
      assert.equal(result.status, 400);
      assert.equal(result.cacheControl, "no-store");
      assert.deepEqual(result.body, {
        ok: false,
        error: {
          code: "EMPTY_MESSAGE",
          message: "Message must include non-whitespace text.",
        },
      });
    }
  });

  it("returns 413 when a string message is longer than 5,000 units", async () => {
    const message = `${secret}${"a".repeat(5001 - secret.length)}`;
    const result = await read(await postJson({ message }));
    assert.equal(message.length, 5001);
    assert.equal(result.status, 413);
    assert.equal(result.cacheControl, "no-store");
    assert.deepEqual(result.body, {
      ok: false,
      error: {
        code: "MESSAGE_TOO_LONG",
        message: "Message must be 5,000 characters or fewer.",
      },
    });
    assert.equal(result.text.includes(secret), false);
  });

  it("returns 503 for a message of exactly 5,000 units", async () => {
    const result = await read(await postJson({ message: "a".repeat(5000) }));
    assert.equal(result.status, 503);
    assert.equal(result.cacheControl, "no-store");
    assert.equal(
      (result.body as { error: { code: string } }).error.code,
      "ANALYSIS_UNAVAILABLE",
    );
  });
});
