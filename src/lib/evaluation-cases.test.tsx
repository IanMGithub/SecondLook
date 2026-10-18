import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AnalysisResult } from "../components/analysis-result";
import { finalizeAnalysis } from "./concern-rubric";
import { analyzeWithRules } from "./rules-analyzer";
import { exampleFixtures } from "./fixtures";
import { analysisStatusCopy, interpretAnalysisBody, settleAnalysisRequest } from "./analyze-request";
import { analyzeSuccessSchema, defaultMessageContext } from "./contract";
import { evidenceOccursLiterally } from "./validate-evidence";
import { highlightEvidence } from "./highlight-evidence";
import {
  contextComparisonCases,
  evaluationCases,
  evaluationScopeNote,
  qualityReviewRubric,
} from "./evaluation-cases";
import {
  evaluationReportPath,
  parseEvaluationArgs,
  summarizeLiveResponse,
} from "./live-evaluation";

const fixtureSummaries = exampleFixtures.map((fixture) => fixture.analysis.summary);

describe("evaluation cases", () => {
  it("keeps scenario judgment separate from the rules record", () => {
    assert.equal(evaluationCases.length, 35);
    assert.match(evaluationScopeNote, /not an accuracy benchmark/);
    assert.match(evaluationScopeNote, /keyword overlap is not a quality score/);
    const rubricIds = qualityReviewRubric.map((item) => item.id);
    assert.deepEqual(rubricIds, [
      "excerpts",
      "summary",
      "advice",
      "routine",
      "context",
      "injection",
    ]);

    const ids = new Set<string>();
    for (const item of evaluationCases) {
      assert.equal(ids.has(item.id), false);
      ids.add(item.id);
      assert.equal(item.message.includes("http://"), false);
      assert.equal(item.acceptable.length > 0, true);
      assert.equal(item.unacceptable.length > 0, true);
      assert.equal(item.rulesLimitation.length > 0, true);
    }

    const ambiguous = evaluationCases.find((item) => item.id === "ambiguous-call");
    assert.equal(ambiguous?.humanReviewRequired, true);
    assert.match(ambiguous?.acceptable.join(" ") ?? "", /More than one/);
  });

  it("checks rules-mode mechanical invariants without scoring explanations", () => {
    for (const item of evaluationCases) {
      const context = item.context ?? defaultMessageContext;
      const analysis = analyzeWithRules(item.message, "not_configured", context);
      const envelope = analyzeSuccessSchema.parse({
        ok: true,
        mode: "rules",
        fallbackReason: "not_configured",
        context,
        analysis,
      });

      assert.equal(envelope.mode, "rules");
      assert.equal(envelope.fallbackReason, "not_configured");
      assert.equal(envelope.analysis.assessment, item.rules.assessment);
      assert.equal(envelope.analysis.concernIndex, item.rules.concernIndex);
      assert.equal(envelope.analysis.concernIndexVersion, "concern-index-v2");
      assert.deepEqual(envelope.context, context);
      assert.equal(envelope.analysis.evidenceStrength, item.rules.evidenceStrength);
      assert.deepEqual(
        envelope.analysis.concernTypes.map((link) => link.type),
        item.rules.concernTypes,
      );
      assert.deepEqual(
        envelope.analysis.indicators.map((indicator) => indicator.evidence),
        item.rules.evidence,
      );
      assert.deepEqual(
        envelope.analysis.safeActions.map((action) => action.title),
        item.rules.safeActionTitles,
      );
      assert.match(envelope.analysis.limitations, /limited rules-based analysis/);
      assert.match(envelope.analysis.limitations, /does not mean the message is safe/);
      assert.match(envelope.analysis.limitations, /do not identify harassment/);
      assert.match(envelope.analysis.limitations, /concern-index-v2/);
      assert.match(envelope.analysis.limitations, /not used by these patterns/);
      for (const indicator of envelope.analysis.indicators) {
        assert.equal(evidenceOccursLiterally(item.message, indicator.evidence), true);
      }
      assert.equal(fixtureSummaries.includes(envelope.analysis.summary), false);
      assert.equal(JSON.stringify(envelope).includes("sk-"), false);
    }
  });

  it("renders an empty rules result instead of an error", () => {
    const item = evaluationCases.find((entry) => entry.id === "routine-appointment");
    assert.ok(item);
    const analysis = analyzeWithRules(item.message, "timeout");
    assert.deepEqual(analysis.indicators, []);
    const outcome = interpretAnalysisBody(item.message, true, {
      ok: true,
      mode: "rules",
      fallbackReason: "timeout",
      context: defaultMessageContext,
      analysis,
    });
    assert.equal(outcome.type, "success");
    const settled = settleAnalysisRequest(
      4,
      4,
      { message: item.message, context: defaultMessageContext },
      outcome,
    );
    assert.equal(settled?.status, "result");
    if (settled?.status !== "result") return;

    const html = renderToStaticMarkup(
      <AnalysisResult message={settled.message} result={settled.result} />,
    );
    assert.match(html, /Limited rules-based analysis/);
    assert.match(html, /AI analysis took too long/);
    assert.match(html, /No excerpts are highlighted/);
    assert.match(html, /No warning signs were selected/);
    assert.match(html, /More context needed/);
    assert.match(html, /Assessment details/);
    assert.match(html, /Insufficient evidence to score/);
    assert.match(html, /Insufficient evidence/);
    assert.match(html, /No potential concern type was linked/);
    assert.equal(html.includes('role="alert"'), false);
    assert.equal(html.includes(analysisStatusCopy.unreadable), false);
    assert.equal(html.includes(analysisStatusCopy.unmatched), false);
    assert.equal(html.includes("<mark"), false);
  });

  it("renders the html evaluation case as text and preserves unusual spaces", () => {
    const item = evaluationCases.find((entry) => entry.id === "html-repeat-whitespace");
    assert.ok(item);
    const analysis = analyzeWithRules(item.message, "invalid_output");
    const password = analysis.indicators.find(
      (indicator) => indicator.evidence === "send  your password",
    );
    assert.ok(password);
    assert.equal(item.message.split("send  your password").length - 1, 2);

    const segments = highlightEvidence(item.message, analysis.indicators);
    const marked = segments.filter((segment) => segment.kind === "evidence");
    assert.equal(
      marked.filter((segment) => segment.text === "send  your password").length,
      2,
    );
    assert.equal(
      marked.some((segment) => segment.text === "in  30 minutes"),
      true,
    );

    const html = renderToStaticMarkup(
      <AnalysisResult
        message={item.message}
        result={{
          ok: true,
          mode: "rules",
          fallbackReason: "invalid_output",
          context: defaultMessageContext,
          analysis,
        }}
      />,
    );
    assert.equal(html.includes("<p>"), false);
    assert.equal(/<a[\s>]/.test(html), false);
    assert.match(html, /&lt;p&gt;/);
    assert.match(html, /https:\/\/tracking\.example\/status/);
    assert.match(html, /send {2}your password/);
    assert.match(html, /in {2}30 minutes/);
  });

  it("does not let an older evaluation result replace a newer one", () => {
    const older = evaluationCases[0];
    const newer = evaluationCases[1];
    assert.ok(older);
    assert.ok(newer);
    const olderOutcome = interpretAnalysisBody(older.message, true, {
      ok: true,
      mode: "rules",
      fallbackReason: "not_configured",
      context: defaultMessageContext,
      analysis: analyzeWithRules(older.message, "not_configured"),
    });
    const settled = settleAnalysisRequest(
      2,
      1,
      { message: older.message, context: defaultMessageContext },
      olderOutcome,
    );
    assert.equal(settled, null);

    const newerOutcome = interpretAnalysisBody(newer.message, true, {
      ok: true,
      mode: "ai",
      context: defaultMessageContext,
      analysis: finalizeAnalysis({
        summary: "Newer result only.",
        indicators: [],
        concernTypes: [],
        safeActions: [
          {
            title: "Compare it with what you already know",
            explanation: "Compare the note with what you already expect.",
          },
        ],
        limitations: "This does not identify the sender.",
      }),
    });
    const accepted = settleAnalysisRequest(
      2,
      2,
      { message: newer.message, context: defaultMessageContext },
      newerOutcome,
    );
    assert.equal(accepted?.status, "result");
    if (accepted?.status !== "result") return;
    assert.equal(accepted.message, newer.message);
    assert.equal(accepted.result.analysis.indicators.length, 0);
    assert.equal(accepted.result.analysis.summary, "Newer result only.");
  });
});

describe("context comparison cases", () => {
  it("keeps rules expectations separate from a live context comparison", () => {
    assert.equal(contextComparisonCases.length, 6);
    const ids = new Set(contextComparisonCases.map((item) => item.id));
    assert.equal(ids.size, contextComparisonCases.length);
    for (const item of contextComparisonCases) {
      assert.equal(item.message.includes("@"), false);
      const absent = analyzeWithRules(item.message, "not_configured", defaultMessageContext);
      const present = analyzeWithRules(item.message, "not_configured", item.context);
      assert.equal(absent.assessment, item.rulesAssessment);
      assert.deepEqual(present, absent);
      assert.equal(JSON.stringify(present.indicators).includes("Friend or family"), false);
    }
  });
});

describe("live evaluation plan", () => {
  it("does not run or write a report without confirmation", () => {
    assert.deepEqual(parseEvaluationArgs([], 12), {
      run: false,
      reason: "confirmation-required",
    });
    assert.deepEqual(parseEvaluationArgs(["--limit", "12"], 12), {
      run: false,
      reason: "confirmation-required",
    });
    assert.equal(evaluationReportPath(new Date("2026-10-17T16:00:00.000Z")).startsWith(
      "evaluation-reports/",
    ), true);
  });

  it("caps the confirmed case limit", () => {
    assert.deepEqual(parseEvaluationArgs(["--confirm"], 12), {
      run: true,
      limit: 3,
      comparison: false,
    });
    assert.deepEqual(parseEvaluationArgs(["--confirm", "--limit", "1"], 12), {
      run: true,
      limit: 1,
      comparison: false,
    });
    assert.deepEqual(parseEvaluationArgs(["--confirm", "--limit", "100"], 12), {
      run: true,
      limit: 12,
      comparison: false,
    });
    assert.deepEqual(parseEvaluationArgs(["--confirm", "--context-pairs"], 6), {
      run: true,
      limit: 2,
      comparison: true,
    });
    assert.deepEqual(parseEvaluationArgs(["--context-pairs"], 6), {
      run: false,
      reason: "confirmation-required",
    });
    assert.deepEqual(parseEvaluationArgs(["--confirm", "--limit", "0"], 12), {
      run: false,
      reason: "invalid-limit",
    });
  });

  it("records fallback results separately from AI results", () => {
    const message = "Can you call me when you get a chance?";
    const analysis = finalizeAnalysis({
      summary: "No pattern was selected.",
      indicators: [],
      concernTypes: [],
      safeActions: [
        {
          title: "Compare it with what you already know",
          explanation: "Compare it with what you already expect.",
        },
      ],
      limitations: "This does not show the message is safe.",
    });
    const ai = summarizeLiveResponse(message, message, 200, {
      ok: true,
      mode: "ai",
      context: defaultMessageContext,
      analysis,
    });
    const rules = summarizeLiveResponse(message, message, 200, {
      ok: true,
      mode: "rules",
      fallbackReason: "timeout",
      context: defaultMessageContext,
      analysis,
    });
    const mixed = summarizeLiveResponse(message, message, 200, {
      ok: true,
      mode: "ai",
      fallbackReason: "timeout",
      context: defaultMessageContext,
      analysis,
    });

    assert.equal(ai.classification, "ai");
    assert.equal(ai.fallbackReason, undefined);
    assert.equal(ai.evidenceLiteral, true);
    assert.equal(ai.indicatorCount, 0);
    assert.equal(rules.classification, "rules-fallback");
    assert.equal(rules.mode, "rules");
    assert.equal(rules.fallbackReason, "timeout");
    assert.equal(mixed.classification, "ai-with-fallback-reason");
    assert.equal(JSON.stringify(rules).includes("No pattern was selected."), false);
  });

  it("does not keep a raw error body", () => {
    const record = summarizeLiveResponse("Hello", "Hello", 500, {
      ok: false,
      error: { code: "ANALYSIS_UNAVAILABLE", message: "sk-secret provider dump" },
    });
    assert.equal(record.classification, "rejected");
    assert.equal(record.rejection, "unavailable");
    assert.equal(JSON.stringify(record).includes("sk-secret"), false);
    assert.equal(JSON.stringify(record).includes("provider dump"), false);
  });
});
