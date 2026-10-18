import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeSuccessSchema, defaultMessageContext, type Analysis } from "../lib/contract";
import { analyzeMessage, type AnalysisProvider } from "./analyze-message";

const message = "Please send your password.";

function modelAnalysis(
  indicators: Array<
    Omit<Analysis["indicators"][number], "id" | "severity" | "support"> &
      Partial<Pick<Analysis["indicators"][number], "severity" | "support">>
  >,
  summary = "Model summary unique.",
) {
  const completed = indicators.map((indicator, index) => ({
    id: `i${index + 1}`,
    severity: "high" as const,
    support: "direct" as const,
    ...indicator,
  }));
  return {
    summary,
    indicators: completed,
    concernTypes:
      completed.length === 0
        ? []
        : [{ type: "scam_fraud" as const, indicatorIds: completed.map((item) => item.id) }],
    safeActions: [
      {
        title: "Check another way",
        explanation: "Use a channel you already trust.",
      },
    ],
    limitations: "This model result does not prove who sent the message.",
    unscoredReading: completed.length === 0 ? ("unclear" as const) : ("unclear" as const),
  };
}

function provider(result: Awaited<ReturnType<AnalysisProvider["analyze"]>>): AnalysisProvider {
  return { analyze: async () => result };
}

describe("analyzeMessage", () => {
  it("uses rules when configuration is missing", async () => {
    const result = await analyzeMessage(message, {
      apiKey: "   ",
      model: "",
    });

    assert.equal(result.mode, "rules");
    assert.equal(result.fallbackReason, "not_configured");
    assert.equal(analyzeSuccessSchema.safeParse(result).success, true);
    assert.match(result.analysis.limitations, /not configured/);
  });

  it("returns a checked AI result without a fallback reason", async () => {
    const analysis = modelAnalysis([
      {
        category: "sensitive_information",
        evidence: "send your password",
        explanation: "Model explanation unique.",
        confidence: "high",
      },
    ]);
    const result = await analyzeMessage(message, {
      provider: provider({ ok: true, analysis }),
    });

    assert.equal(result.mode, "ai");
    assert.equal("fallbackReason" in result, false);
    assert.equal(result.analysis.summary, "Model summary unique.");
    assert.equal(result.analysis.indicators.length, 1);
    assert.equal(
      result.analysis.indicators[0]?.explanation,
      "Model explanation unique.",
    );
    assert.equal(
      result.analysis.summary.includes("limited rules"),
      false,
    );
  });

  it("accepts an AI result with no indicators", async () => {
    const result = await analyzeMessage("Hello from a neighbor.", {
      provider: provider({ ok: true, analysis: modelAnalysis([]) }),
    });
    assert.equal(result.mode, "ai");
    assert.equal(result.analysis.assessment, "unclear");
    assert.deepEqual(result.analysis.indicators, []);
    assert.deepEqual(result.context, defaultMessageContext);
  });

  it("keeps user-reported context and can return no specific concern", async () => {
    const context = { apparentSender: "friend_or_family" as const, expected: "yes" as const };
    let seen: { message: string; context: unknown } | undefined;
    const result = await analyzeMessage("Can you send me a photo from the picnic?", {
      context,
      provider: {
        analyze: async (message, received) => {
          seen = { message, context: received };
          return {
            ok: true,
            analysis: {
              ...modelAnalysis([], "No specific warning signs identified in this message."),
              unscoredReading: "no_specific_concern",
              safeActions: [],
              context: { apparentSender: "unknown_sender", expected: "no" },
            },
          };
        },
      },
    });
    assert.deepEqual(seen, {
      message: "Can you send me a photo from the picnic?",
      context,
    });
    assert.equal(result.mode, "ai");
    assert.equal(result.analysis.assessment, "no_specific_concern");
    assert.deepEqual(result.context, context);
    assert.equal(JSON.stringify(result.analysis).includes("unknown_sender"), false);
    assert.equal(JSON.stringify(result.analysis).includes("Friend or family"), false);
  });

  it("rejects a context label used as evidence", async () => {
    const result = await analyzeMessage("Can you send me a photo from the picnic?", {
      context: { apparentSender: "friend_or_family", expected: "yes" },
      provider: provider({
        ok: true,
        analysis: modelAnalysis(
          [
            {
              category: "other",
              evidence: "Friend or family",
              explanation: "The model copied the context label.",
              confidence: "low",
            },
          ],
          "MODEL SUMMARY",
        ),
      }),
    });
    assert.equal(result.mode, "rules");
    assert.equal(result.fallbackReason, "invalid_output");
    assert.equal(JSON.stringify(result.analysis).includes("MODEL SUMMARY"), false);
    assert.equal(JSON.stringify(result).includes("Friend or family"), false);
    assert.deepEqual(result.context, { apparentSender: "friend_or_family", expected: "yes" });
  });

  it("does not drop a credential request when the apparent sender is familiar", async () => {
    const context = { apparentSender: "friend_or_family" as const, expected: "yes" as const };
    const result = await analyzeMessage("Please share your verification code.", {
      context,
      provider: provider({ ok: false, reason: "timeout" }),
    });
    assert.equal(result.mode, "rules");
    assert.equal(result.analysis.assessment, "high_concern");
    assert.equal(result.analysis.indicators[0]?.evidence, "share your verification code");
    assert.deepEqual(result.context, context);
  });

  it("falls back for timeout, rate limit, and provider failure", async () => {
    for (const reason of ["timeout", "rate_limited", "provider_error"] as const) {
      const result = await analyzeMessage(message, {
        provider: provider({ ok: false, reason }),
      });
      assert.equal(result.mode, "rules");
      assert.equal(result.fallbackReason, reason);
      assert.equal(result.analysis.summary.includes("Model summary"), false);
      assert.equal(analyzeSuccessSchema.safeParse(result).success, true);
    }
  });

  it("turns a thrown provider error into rules output", async () => {
    const result = await analyzeMessage(message, {
      provider: {
        analyze: async () => {
          throw new Error("sk-secret request body");
        },
      },
    });
    assert.equal(result.mode, "rules");
    assert.equal(result.fallbackReason, "provider_error");
    assert.equal(JSON.stringify(result).includes("sk-secret"), false);
  });

  it("rejects a malformed model object and keeps the rules result", async () => {
    const result = await analyzeMessage(message, {
      provider: provider({
        ok: true,
        analysis: { assessment: "urgent", summary: "MODEL SUMMARY" },
      }),
    });
    assert.equal(result.mode, "rules");
    assert.equal(result.fallbackReason, "invalid_output");
    assert.equal(JSON.stringify(result).includes("MODEL SUMMARY"), false);
  });

  it("rejects fabricated or whitespace-mismatched evidence without keeping the model summary", async () => {
    const cases = [
      modelAnalysis([
        {
          category: "other",
          evidence: "not in the message",
          explanation: "Invented.",
          confidence: "low",
        },
      ]),
      modelAnalysis([
        {
          category: "urgency",
          evidence: "in 30 minutes",
          explanation: "Collapsed the spaces.",
          confidence: "low",
        },
      ], "MODEL SUMMARY"),
    ];
    const spaced = "Your account will be restricted in  30 minutes.";

    const fabricated = await analyzeMessage(message, {
      provider: provider({ ok: true, analysis: cases[0] }),
    });
    const mismatched = await analyzeMessage(spaced, {
      provider: provider({ ok: true, analysis: cases[1] }),
    });

    for (const result of [fabricated, mismatched]) {
      assert.equal(result.mode, "rules");
      assert.equal(result.fallbackReason, "invalid_output");
      assert.equal(JSON.stringify(result).includes("MODEL SUMMARY"), false);
      assert.equal(JSON.stringify(result).includes("not in the message"), false);
    }
    assert.equal(mismatched.analysis.indicators[0]?.evidence, "in  30 minutes");
  });

  it("rejects the whole model result when any excerpt is not literal", async () => {
    const result = await analyzeMessage(message, {
      provider: provider({
        ok: true,
        analysis: modelAnalysis(
          [
            {
              category: "sensitive_information",
              evidence: "send your password",
              explanation: "Real excerpt.",
              confidence: "high",
            },
            {
              category: "other",
              evidence: "invented excerpt",
              explanation: "Not copied.",
              confidence: "low",
            },
          ],
          "MODEL SUMMARY",
        ),
      }),
    });
    assert.equal(result.mode, "rules");
    assert.equal(JSON.stringify(result).includes("MODEL SUMMARY"), false);
    assert.equal(JSON.stringify(result).includes("Real excerpt"), false);
  });

  it("drops duplicate indicators and still reports AI provenance", async () => {
    const indicator = {
      category: "sensitive_information" as const,
      evidence: "send your password",
      explanation: "Model explanation unique.",
      confidence: "high" as const,
    };
    const result = await analyzeMessage(message, {
      provider: provider({
        ok: true,
        analysis: modelAnalysis([indicator, { ...indicator }]),
      }),
    });
    assert.equal(result.mode, "ai");
    assert.equal(result.analysis.indicators.length, 1);
    assert.equal(result.analysis.concernIndex, 45);
  });

  it("rejects an invalid concern-type reference instead of displaying the type", async () => {
    const drafted = modelAnalysis([
      {
        category: "sensitive_information",
        evidence: "send your password",
        explanation: "Model explanation unique.",
        confidence: "high",
      },
    ]);
    const missing = {
      ...drafted,
      concernTypes: [{ type: "impersonation" as const, indicatorIds: ["i9"] }],
    };
    const duplicateIds = {
      ...drafted,
      indicators: [
        drafted.indicators[0],
        { ...drafted.indicators[0], id: "i1", evidence: "send your password" },
      ],
    };
    for (const analysis of [missing, duplicateIds]) {
      const result = await analyzeMessage(message, {
        provider: provider({ ok: true, analysis }),
      });
      assert.equal(result.mode, "rules");
      assert.equal(result.fallbackReason, "invalid_output");
      assert.equal(
        result.analysis.concernTypes.some((link) => link.type === "impersonation"),
        false,
      );
    }
  });

  it("recomputes the index and ignores a model-supplied score", async () => {
    const drafted = modelAnalysis(
      [
        {
          category: "other",
          evidence: "send your password",
          explanation: "Model explanation unique.",
          confidence: "high",
          severity: "low",
          support: "contextual",
        },
      ],
      "Model summary unique.",
    );
    const result = await analyzeMessage(message, {
      provider: provider({
        ok: true,
        analysis: { ...drafted, concernIndex: 99, assessment: "high_concern" },
      }),
    });
    assert.equal(result.mode, "ai");
    assert.equal(result.analysis.concernIndex, 15);
    assert.equal(result.analysis.assessment, "some_concern");
    assert.equal(result.analysis.evidenceStrength, "context_dependent");
  });

  it("does not call the model builder when only one setting is present", async () => {
    const keyOnly = await analyzeMessage("Hello.", { apiKey: "present" });
    const modelOnly = await analyzeMessage("Hello.", { model: "gpt-5-mini" });
    assert.equal(keyOnly.fallbackReason, "not_configured");
    assert.equal(modelOnly.fallbackReason, "not_configured");
    assert.equal(keyOnly.mode, "rules");
    assert.equal(modelOnly.mode, "rules");
  });
});
