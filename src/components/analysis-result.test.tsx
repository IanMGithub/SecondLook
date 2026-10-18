import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AnalysisResult } from "./analysis-result";
import { finalizeAnalysis } from "../lib/concern-rubric";
import { defaultMessageContext, type AnalyzeSuccess, type Indicator } from "../lib/contract";

function result(
  mode: AnalyzeSuccess["mode"],
  indicators: Array<Omit<Indicator, "id" | "severity" | "support">>,
  options: {
    unscoredReading?: "no_specific_concern" | "unclear";
    context?: AnalyzeSuccess["context"];
  } = {},
): AnalyzeSuccess {
  const completed = indicators.map((indicator, index) => ({
    ...indicator,
    id: `i${index + 1}`,
    severity: "high" as const,
    support: "direct" as const,
  }));
  return {
    ok: true,
    mode,
    context: options.context ?? { ...defaultMessageContext },
    ...(mode === "rules" ? { fallbackReason: "not_configured" as const } : {}),
    analysis: finalizeAnalysis({
      summary: "Summary for this message only.",
      indicators: completed,
      concernTypes:
        completed.length === 0
          ? []
          : [{ type: "scam_fraud", indicatorIds: completed.map((item) => item.id) }],
      safeActions: [
        {
          title: "Check another way",
          explanation: "Use a channel you already trust.",
        },
      ],
      limitations: "This result cannot prove who sent the message.",
      unscoredReading: options.unscoredReading,
    }),
  };
}

describe("AnalysisResult markup", () => {
  it("labels AI and rules results differently", () => {
    const message = "Please send your password.";
    const indicator = {
      category: "sensitive_information" as const,
      evidence: "send your password",
      explanation: "This asks for a password.",
      confidence: "high" as const,
    };
    const ai = renderToStaticMarkup(
      <AnalysisResult message={message} result={result("ai", [indicator])} />,
    );
    const rules = renderToStaticMarkup(
      <AnalysisResult message={message} result={result("rules", [indicator])} />,
    );

    assert.match(ai, /AI-assisted analysis/);
    assert.equal(ai.includes("Limited rules-based analysis"), false);
    assert.match(rules, /Limited rules-based analysis/);
    assert.match(rules, /AI analysis is not configured/);
    assert.match(rules, /comes from limited rules/);
    assert.equal(ai.includes("Mock analysis"), false);
    assert.equal(rules.includes("Mock analysis"), false);
    assert.match(ai, /High concern/);
    assert.match(ai, /stronger warning signs/);
    assert.match(ai, /45/);
    assert.match(ai, /Heuristic warning-sign index, not a probability of fraud or harm/);
    assert.match(ai, /Scam or fraud/);
    assert.match(ai, /Direct textual support/);
    assert.match(ai, /How this is calculated/);
    assert.match(ai, /concern-index-v2/);
    assert.match(ai, /Context considered/);
    assert.match(ai, /User-provided/);
    assert.match(ai, /Not sure/);
    assert.match(ai, /Based on the message text and your reported context/);
    assert.match(ai, /Full limitations/);
    assert.match(ai, /not a multiplier in the concern index/);
    assert.match(ai, /<mark/);
  });

  it("renders a no-specific-concern result without a failure-style score panel", () => {
    const html = renderToStaticMarkup(
      <AnalysisResult
        message="Hello from a neighbor."
        result={result("ai", [], { unscoredReading: "no_specific_concern" })}
      />,
    );
    assert.match(html, /<article/);
    assert.match(html, /Looks routine/);
    assert.match(html, /No specific warning signs were identified/);
    assert.match(html, /Assessment details/);
    assert.match(html, /Insufficient evidence to score/);
    assert.equal(html.includes("Potential concern types"), false);
    assert.equal(html.includes("No potential concern type was linked"), false);
    assert.equal(html.includes("text-xl font-semibold text-stone-950\">Insufficient"), false);
    assert.match(html, /No excerpts are highlighted/);
    assert.match(html, /No specific warning signs identified in this message/);
    assert.match(html, /Full limitations/);
    assert.equal(html.includes("<mark"), false);
    assert.equal(html.includes('role="alert"'), false);
  });

  it("renders an unclear empty result with a readable headline", () => {
    const html = renderToStaticMarkup(
      <AnalysisResult message="Hello from a neighbor." result={result("ai", [])} />,
    );
    assert.match(html, /More context needed/);
    assert.match(html, /not enough clear warning-sign evidence/);
    assert.match(html, /Assessment details/);
    assert.match(html, /Insufficient evidence to score/);
    assert.match(html, /No potential concern type was linked/);
    assert.equal(html.includes("0 means safe"), false);
    assert.equal(html.includes("text-green"), false);
    assert.match(html, /No warning signs were selected/);
    assert.match(html, /does not establish that the message is safe/);
    assert.equal(html.includes("<mark"), false);
  });

  it("renders HTML-like text and URLs as text", () => {
    const message = '<script>alert(1)</script>\nhttps://example.com';
    const html = renderToStaticMarkup(
      <AnalysisResult
        message={message}
        result={result("ai", [
          {
            category: "other",
            evidence: "<script>alert(1)</script>",
            explanation: 'See <a href="https://evil.test">this</a>',
            confidence: "low",
          },
        ])}
      />,
    );
    assert.equal(html.includes("<script>"), false);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.equal(/<a[\s>]/.test(html), false);
    assert.match(html, /https:\/\/example.com/);
    assert.match(html, /&lt;a href/);
  });
});
