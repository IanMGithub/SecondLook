import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeErrorSchema, analyzeSuccessSchema } from "../../../lib/contract";
import { handleAnalyzeRequest, POST } from "./route";
import type { AnalysisProvider } from "../../../server/analyze-message";

const url = "http://localhost/api/analyze";
const secret = "submitted-secret-phrase";

function postJson(
  body: unknown,
  contentType = "application/json",
  provider?: AnalysisProvider,
) {
  return handleAnalyzeRequest(
    new Request(url, {
      method: "POST",
      headers: { "content-type": contentType },
      body: JSON.stringify(body),
    }),
    provider ? { provider } : {},
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
  it("accepts application/json and returns rules analysis when unconfigured", async () => {
    const result = await read(await postJson({ message: `  ${secret}  ` }));
    const body = result.body as {
      ok: boolean;
      mode: string;
      fallbackReason: string;
      analysis: { assessment: string; indicators: unknown[] };
    };
    assert.equal(result.status, 200);
    assert.equal(result.cacheControl, "no-store");
    assert.equal(body.ok, true);
    assert.equal(body.mode, "rules");
    assert.equal(body.fallbackReason, "not_configured");
    assert.equal(body.analysis.assessment, "unclear");
    assert.deepEqual(body.analysis.indicators, []);
    assert.equal(analyzeSuccessSchema.safeParse(result.body).success, true);
    assert.equal(result.text.includes(secret), false);
  });

  it("accepts a JSON media type with charset=utf-8", async () => {
    const result = await read(
      await postJson({ message: "Hello" }, "application/json; charset=utf-8"),
    );
    assert.equal(result.status, 200);
    assert.equal(result.cacheControl, "no-store");
    assert.equal(
      (result.body as { mode: string; fallbackReason: string }).mode,
      "rules",
    );
    assert.equal(
      (result.body as { fallbackReason: string }).fallbackReason,
      "not_configured",
    );
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
    assert.equal(analyzeErrorSchema.safeParse(result.body).success, true);
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
        message:
          "Request must be an object with a message string. Context, if included, must use the allowed choices.",
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

  it("returns rules analysis for a message of exactly 5,000 units", async () => {
    const message = "a".repeat(5000);
    const result = await read(await postJson({ message }));
    assert.equal(result.status, 200);
    assert.equal(result.cacheControl, "no-store");
    assert.equal(
      (result.body as { mode: string; fallbackReason: string }).fallbackReason,
      "not_configured",
    );
    assert.equal(result.text.includes(message), false);
  });

  it("does not call the provider for a malformed request", async () => {
    let calls = 0;
    const provider: AnalysisProvider = {
      analyze: async () => {
        calls += 1;
        return { ok: false, reason: "provider_error" };
      },
    };
    const cases = [
      new Request(url, {
        method: "POST",
        body: new Uint8Array(Buffer.from(JSON.stringify({ message: secret }))),
      }),
      new Request(url, {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: JSON.stringify({ message: secret }),
      }),
      new Request(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: `{"message":"${secret}"`,
      }),
      new Request(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: secret, extra: true }),
      }),
      new Request(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "   " }),
      }),
      new Request(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "a".repeat(5001) }),
      }),
    ];

    for (const request of cases) {
      const response = await handleAnalyzeRequest(request, {
        provider,
        apiKey: "present",
        model: "gpt-5-mini",
      });
      assert.notEqual(response.status, 200);
    }
    assert.equal(calls, 0);
  });

  it("returns an injected AI result without a fallback reason", async () => {
    const provider: AnalysisProvider = {
      analyze: async () => ({
        ok: true,
        analysis: {
          summary: "Nothing specific in this note.",
          indicators: [],
          concernTypes: [],
          safeActions: [
            {
              title: "Compare records",
              explanation: "Use what you already know.",
            },
          ],
          limitations: "This does not show the note is safe.",
          unscoredReading: "no_specific_concern",
        },
      }),
    };
    const result = await read(
      await postJson({ message: "Hello from a neighbor." }, "application/json", provider),
    );
    const body = result.body as {
      mode: string;
      fallbackReason?: string;
      analysis: { assessment: string; indicators: unknown[] };
    };
    assert.equal(result.status, 200);
    assert.equal(result.cacheControl, "no-store");
    assert.equal(body.mode, "ai");
    assert.equal(body.fallbackReason, undefined);
    assert.equal(body.analysis.assessment, "no_specific_concern");
    assert.deepEqual(body.analysis.indicators, []);
    assert.deepEqual(
      (result.body as { context: unknown }).context,
      { apparentSender: "not_sure", expected: "not_sure" },
    );
    assert.equal(analyzeSuccessSchema.safeParse(result.body).success, true);
  });

  it("POST uses rules when the process has no OpenAI configuration", async () => {
    const previousKey = process.env.OPENAI_API_KEY;
    const previousModel = process.env.OPENAI_MODEL;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
    try {
      const response = await POST(
        new Request(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: "Hello" }),
        }),
      );
      const result = await read(response);
      assert.equal(result.status, 200);
      assert.equal(result.cacheControl, "no-store");
      assert.equal(
        (result.body as { mode: string; fallbackReason: string }).mode,
        "rules",
      );
      assert.equal(
        (result.body as { fallbackReason: string }).fallbackReason,
        "not_configured",
      );
    } finally {
      if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = previousKey;
      if (previousModel === undefined) delete process.env.OPENAI_MODEL;
      else process.env.OPENAI_MODEL = previousModel;
    }
  });
});
