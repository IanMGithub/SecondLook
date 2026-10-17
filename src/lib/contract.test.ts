import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analysisSchema,
  analyzeErrorSchema,
  analyzeSuccessSchema,
  indicatorSchema,
  parseAnalyzeRequest,
} from "./contract";
import { exampleFixtures } from "./fixtures";

const secret = "submitted-secret-phrase";

describe("parseAnalyzeRequest", () => {
  it("accepts an ordinary message", () => {
    assert.deepEqual(parseAnalyzeRequest({ message: "Hello from a friend." }), {
      ok: true,
      message: "Hello from a friend.",
    });
  });

  it("preserves leading and trailing whitespace", () => {
    const message = "  hello  ";
    const parsed = parseAnalyzeRequest({ message });
    assert.deepEqual(parsed, { ok: true, message });
  });

  it("rejects an empty message without echoing it", () => {
    const parsed = parseAnalyzeRequest({ message: "" });
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.status, 400);
      assert.equal(parsed.code, "EMPTY_MESSAGE");
      assert.equal(parsed.error.includes(secret), false);
    }
  });

  it("rejects whitespace without changing or returning it", () => {
    const message = " \n\t ";
    const parsed = parseAnalyzeRequest({ message });
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.code, "EMPTY_MESSAGE");
      assert.equal(JSON.stringify(parsed).includes("\n"), false);
    }
  });

  it("rejects a missing message", () => {
    const parsed = parseAnalyzeRequest({});
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.equal(parsed.code, "INVALID_REQUEST");
  });

  it("rejects null, numeric, object, and array messages", () => {
    for (const message of [null, 42, { text: secret }, [secret]]) {
      const parsed = parseAnalyzeRequest({ message });
      assert.equal(parsed.ok, false);
      if (!parsed.ok) {
        assert.equal(parsed.code, "INVALID_REQUEST");
        assert.equal(JSON.stringify(parsed).includes(secret), false);
        assert.equal(JSON.stringify(parsed).includes("42"), false);
      }
    }
  });

  it("rejects a top-level null or array", () => {
    for (const body of [null, [secret]]) {
      const parsed = parseAnalyzeRequest(body);
      assert.equal(parsed.ok, false);
      if (!parsed.ok) {
        assert.equal(parsed.code, "INVALID_REQUEST");
        assert.equal(JSON.stringify(parsed).includes(secret), false);
      }
    }
  });

  it("rejects unexpected fields without echoing them", () => {
    const parsed = parseAnalyzeRequest({
      message: "Hello",
      token: secret,
    });
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.code, "INVALID_REQUEST");
      assert.equal(JSON.stringify(parsed).includes(secret), false);
    }
  });

  it("accepts exactly 5,000 string units", () => {
    const message = "a".repeat(5000);
    const parsed = parseAnalyzeRequest({ message });
    assert.deepEqual(parsed, { ok: true, message });
    assert.equal(message.length, 5000);
  });

  it("rejects 5,001 string units", () => {
    const message = `${secret}${"a".repeat(5001 - secret.length)}`;
    assert.equal(message.length, 5001);
    const parsed = parseAnalyzeRequest({ message });
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.status, 413);
      assert.equal(parsed.code, "MESSAGE_TOO_LONG");
      assert.equal(JSON.stringify(parsed).includes(secret), false);
    }
  });
});

describe("analysis schema", () => {
  it("accepts every fictional fixture result unchanged", () => {
    for (const example of exampleFixtures) {
      assert.deepEqual(analysisSchema.parse(example.analysis), example.analysis);
    }
  });

  it("accepts an empty indicators array", () => {
    const analysis = {
      assessment: "unclear" as const,
      summary: "No warning signs are illustrated.",
      indicators: [],
      safeActions: [
        {
          title: "Check your own records",
          explanation: "Use a confirmation you already have.",
        },
      ],
      limitations: "Text alone cannot show who sent this.",
    };
    assert.deepEqual(analysisSchema.parse(analysis), analysis);
  });

  it("rejects unknown assessment, category, and confidence values", () => {
    const valid = exampleFixtures[0].analysis;
    assert.equal(
      analysisSchema.safeParse({ ...valid, assessment: "safe" }).success,
      false,
    );
    assert.equal(
      indicatorSchema.safeParse({
        ...valid.indicators[0],
        category: "scam",
      }).success,
      false,
    );
    assert.equal(
      indicatorSchema.safeParse({
        ...valid.indicators[0],
        confidence: "certain",
      }).success,
      false,
    );
  });

  it("rejects missing required fields", () => {
    const valid = exampleFixtures[0].analysis;
    const withoutSummary = Object.fromEntries(
      Object.entries(valid).filter(([key]) => key !== "summary"),
    );
    assert.equal(analysisSchema.safeParse(withoutSummary).success, false);

    const withoutEvidence = Object.fromEntries(
      Object.entries(valid.indicators[0]).filter(([key]) => key !== "evidence"),
    );
    assert.equal(indicatorSchema.safeParse(withoutEvidence).success, false);
  });

  it("rejects blank evidence and preserves surrounding spaces", () => {
    const indicator = exampleFixtures[0].analysis.indicators[0];
    assert.equal(
      indicatorSchema.safeParse({ ...indicator, evidence: "   " }).success,
      false,
    );

    const evidence = "  in 30 minutes  ";
    assert.equal(
      indicatorSchema.parse({ ...indicator, evidence }).evidence,
      evidence,
    );
  });
});

describe("response envelopes", () => {
  it("describes a future success without a mock mode", () => {
    const success = analyzeSuccessSchema.parse({
      ok: true,
      mode: "rules",
      analysis: exampleFixtures[2].analysis,
    });
    assert.equal(success.mode, "rules");
    assert.equal(
      analyzeSuccessSchema.safeParse({
        ok: true,
        mode: "mock",
        analysis: exampleFixtures[2].analysis,
      }).success,
      false,
    );
  });

  it("describes the error envelope", () => {
    assert.deepEqual(
      analyzeErrorSchema.parse({
        ok: false,
        error: {
          code: "ANALYSIS_UNAVAILABLE",
          message: "Live analysis is not connected yet.",
        },
      }),
      {
        ok: false,
        error: {
          code: "ANALYSIS_UNAVAILABLE",
          message: "Live analysis is not connected yet.",
        },
      },
    );
  });
});
