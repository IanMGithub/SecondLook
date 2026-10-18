import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { exampleFixtures } from "./fixtures";
import {
  analysisProvenanceLabel,
  analysisStatusCopy,
  interpretAnalysisBody,
  prepareSubmission,
  requestAnalysis,
  rulesProvenanceText,
  settleAnalysisRequest,
  type AnalysisRequestOutcome,
} from "./analyze-request";
import { finalizeAnalysis } from "./concern-rubric";
import { defaultMessageContext, type AnalyzeSuccess, type FallbackReason } from "./contract";

const secret = "submitted-secret-phrase";
const fixtureSummary = exampleFixtures[0].analysis.summary;

function analysis(
  evidence: string[] = ["send your password"],
  summary = "Model summary unique.",
): AnalyzeSuccess["analysis"] {
  const indicators = evidence.map((item, index) => ({
    id: `i${index + 1}`,
    category: "other" as const,
    evidence: item,
    explanation: "This excerpt is in the message.",
    confidence: "low" as const,
    severity: "moderate" as const,
    support: "contextual" as const,
  }));
  return finalizeAnalysis({
    summary,
    indicators,
    concernTypes:
      indicators.length === 0
        ? []
        : [{ type: "scam_fraud", indicatorIds: indicators.map((item) => item.id) }],
    safeActions: [
      {
        title: "Check another way",
        explanation: "Use a channel you already trust.",
      },
    ],
    limitations: "The text cannot prove who sent the message.",
  });
}

function success(
  mode: AnalyzeSuccess["mode"],
  evidence: string[] = ["send your password"],
  fallbackReason?: FallbackReason,
): AnalyzeSuccess {
  return {
    ok: true,
    mode,
    context: { ...defaultMessageContext },
    ...(fallbackReason ? { fallbackReason } : {}),
    analysis: analysis(evidence),
  };
}

describe("prepareSubmission", () => {
  it("keeps the message exactly when it can be sent", () => {
    assert.deepEqual(prepareSubmission(`  ${secret}  `), {
      ok: true,
      message: `  ${secret}  `,
    });
  });

  it("rejects blank text and an over-long message before a request", () => {
    assert.deepEqual(prepareSubmission(" \n\t "), { ok: false, reason: "empty" });
    assert.deepEqual(prepareSubmission("a".repeat(5001)), {
      ok: false,
      reason: "tooLong",
    });
  });
});

describe("interpretAnalysisBody", () => {
  it("accepts an AI result and a rules result", () => {
    const message = "Please send your password.";
    const ai = interpretAnalysisBody(message, true, success("ai"));
    const rules = interpretAnalysisBody(
      message,
      true,
      success("rules", ["send your password"], "not_configured"),
    );
    assert.equal(ai.type, "success");
    assert.equal(rules.type, "success");
    if (ai.type === "success" && rules.type === "success") {
      assert.equal(ai.result.mode, "ai");
      assert.equal(rules.result.mode, "rules");
      assert.equal(rules.result.fallbackReason, "not_configured");
      assert.equal(ai.result.analysis.summary, "Model summary unique.");
      assert.notEqual(ai.result.analysis.summary, fixtureSummary);
    }
  });

  it("accepts empty indicators", () => {
    const body = success("ai", []);
    body.analysis.indicators = [];
    const outcome = interpretAnalysisBody("Hello from a neighbor.", true, body);
    assert.equal(outcome.type, "success");
    if (outcome.type === "success") {
      assert.deepEqual(outcome.result.analysis.indicators, []);
    }
  });

  it("maps known API errors without using the server message", () => {
    for (const [code, expected] of [
      ["EMPTY_MESSAGE", analysisStatusCopy.empty],
      ["MESSAGE_TOO_LONG", analysisStatusCopy.tooLong],
      ["INVALID_REQUEST", analysisStatusCopy.unavailable],
    ] as const) {
      const outcome = interpretAnalysisBody("Hello", false, {
        ok: false,
        error: { code, message: `${secret} ${fixtureSummary}` },
      });
      assert.deepEqual(outcome, { type: "error", message: expected });
      assert.equal(JSON.stringify(outcome).includes(secret), false);
      assert.equal(JSON.stringify(outcome).includes(fixtureSummary), false);
    }
  });

  it("uses generic copy for an unknown error code", () => {
    const outcome = interpretAnalysisBody("Hello", false, {
      ok: false,
      error: {
        code: "ANALYSIS_UNAVAILABLE",
        message: "raw provider failure",
      },
    });
    assert.deepEqual(outcome, {
      type: "error",
      message: analysisStatusCopy.unavailable,
    });
  });

  it("rejects non-objects, malformed envelopes, and a success body on an error status", () => {
    const bodies = [
      null,
      "not-json",
      { ok: true, mode: "ai" },
      { ok: false },
      { ok: false, error: { code: "", message: secret } },
      success("ai"),
    ];
    for (const [index, body] of bodies.entries()) {
      const responseOk = index === bodies.length - 1 ? false : true;
      const outcome = interpretAnalysisBody("Please send your password.", responseOk, body);
      assert.equal(outcome.type, "error");
      if (outcome.type === "error") {
        assert.equal(outcome.message, analysisStatusCopy.unreadable);
        assert.equal(outcome.message.includes(fixtureSummary), false);
      }
    }
  });

  it("rejects unmatched and whitespace-mismatched evidence", () => {
    const fabricated = interpretAnalysisBody(
      "Please send your password.",
      true,
      success("ai", ["not in the message"]),
    );
    const mismatched = interpretAnalysisBody(
      "in  30 minutes",
      true,
      success("ai", ["in 30 minutes"]),
    );
    assert.deepEqual(fabricated, {
      type: "error",
      message: analysisStatusCopy.unmatched,
    });
    assert.deepEqual(mismatched, {
      type: "error",
      message: analysisStatusCopy.unmatched,
    });
  });

  it("keeps HTML-like evidence only when it occurs literally", () => {
    const message = "<script>alert(1)</script> https://example.com";
    const outcome = interpretAnalysisBody(
      message,
      true,
      success("rules", ["<script>alert(1)</script>"], "timeout"),
    );
    assert.equal(outcome.type, "success");
  });
});

describe("provenance copy", () => {
  it("names AI and rules separately", () => {
    assert.equal(analysisProvenanceLabel("ai"), "AI-assisted analysis");
    assert.equal(analysisProvenanceLabel("rules"), "Limited rules-based analysis");
  });

  it("explains each rules fallback without mixing the two results", () => {
    const reasons: FallbackReason[] = [
      "not_configured",
      "timeout",
      "rate_limited",
      "provider_error",
      "invalid_output",
    ];
    for (const reason of reasons) {
      const text = rulesProvenanceText(reason);
      assert.match(text, /comes from limited rules/);
      assert.equal(text.includes("AI-assisted analysis"), false);
    }
    assert.match(rulesProvenanceText("not_configured"), /not configured/);
    assert.match(rulesProvenanceText("timeout"), /took too long/);
    assert.match(rulesProvenanceText("rate_limited"), /temporarily unavailable/);
    assert.match(rulesProvenanceText("provider_error"), /temporarily unavailable/);
    assert.match(rulesProvenanceText("invalid_output"), /could not be validated/);
    assert.equal(
      rulesProvenanceText(undefined),
      "The result shown here comes from limited rules.",
    );
  });
});

describe("requestAnalysis", () => {
  it("posts the exact message and does not retry", async () => {
    let calls = 0;
    const outcome = await requestAnalysis(
      `  ${secret}  `,
      defaultMessageContext,
      new AbortController().signal,
      async (_url, init) => {
        calls += 1;
        assert.equal(init?.method, "POST");
        assert.equal(
          new Headers(init?.headers).get("content-type"),
          "application/json",
        );
        assert.equal(
          init?.body,
          JSON.stringify({ message: `  ${secret}  `, context: defaultMessageContext }),
        );
        return Response.json(success("ai", []));
      },
    );
    assert.equal(calls, 1);
    assert.equal(outcome.type, "success");
  });

  it("reports a network failure and a non-JSON body", async () => {
    const network = await requestAnalysis(
      "Hello",
      defaultMessageContext,
      new AbortController().signal,
      async () => {
        throw new TypeError("socket hang up");
      },
    );
    const unreadable = await requestAnalysis(
      "Hello",
      defaultMessageContext,
      new AbortController().signal,
      async () => new Response("nope", { status: 502 }),
    );
    assert.deepEqual(network, { type: "error", message: analysisStatusCopy.network });
    assert.deepEqual(unreadable, {
      type: "error",
      message: analysisStatusCopy.unreadable,
    });
    assert.equal(JSON.stringify(network).includes("socket"), false);
  });

  it("stays silent when the request is aborted", async () => {
    const early = new AbortController();
    early.abort();
    let calls = 0;
    const before = await requestAnalysis("Hello", defaultMessageContext, early.signal, async () => {
      calls += 1;
      return Response.json(success("ai", []));
    });
    assert.equal(calls, 0);
    assert.deepEqual(before, { type: "aborted" });

    const controller = new AbortController();
    const pending = requestAnalysis("Hello", defaultMessageContext, controller.signal, (_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const error = new Error("The operation was aborted.");
          error.name = "AbortError";
          reject(error);
        });
      });
    });
    controller.abort();
    assert.deepEqual(await pending, { type: "aborted" });
  });
});

describe("settleAnalysisRequest", () => {
  it("drops an aborted outcome and an older request", () => {
    const submitted = {
      message: "Please send your password.",
      context: defaultMessageContext,
    };
    const outcome: AnalysisRequestOutcome = {
      type: "success",
      result: success("ai"),
    };
    assert.equal(settleAnalysisRequest(2, 2, submitted, { type: "aborted" }), null);
    assert.equal(settleAnalysisRequest(3, 2, submitted, outcome), null);
  });

  it("keeps the submitted snapshot for the current request", () => {
    const submitted = {
      message: "Please send your password.",
      context: { apparentSender: "friend_or_family" as const, expected: "yes" as const },
    };
    const echoed = success("rules", ["send your password"], "timeout");
    echoed.context = submitted.context;
    const settled = settleAnalysisRequest(4, 4, submitted, {
      type: "success",
      result: echoed,
    });
    assert.deepEqual(settled, {
      status: "result",
      message: submitted.message,
      context: submitted.context,
      result: echoed,
    });
  });

  it("returns an error without a fixture analysis", () => {
    const settled = settleAnalysisRequest(1, 1, { message: "Hello", context: defaultMessageContext }, {
      type: "error",
      message: analysisStatusCopy.unmatched,
    });
    assert.deepEqual(settled, {
      status: "error",
      message: analysisStatusCopy.unmatched,
    });
    assert.equal(JSON.stringify(settled).includes(fixtureSummary), false);
  });
});
