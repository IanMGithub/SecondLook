import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportDocument } from "../components/report-dialog";
import { finalizeAnalysis } from "./concern-rubric";
import { noSpecificConcernEvidenceCopy } from "./result-copy";
import { defaultMessageContext, type AnalyzeSuccess, type Indicator } from "./contract";
import { buildReport, formatReport, writeReport } from "./report";
import { excerptSensitivityCopy, reportDisclaimer } from "./result-copy";

function result(
  mode: AnalyzeSuccess["mode"],
  indicators: Array<Omit<Indicator, "id" | "severity" | "support">> = [],
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
    context: { ...defaultMessageContext },
    ...(mode === "rules" ? { fallbackReason: "not_configured" as const } : {}),
    analysis: finalizeAnalysis({
      summary: "Summary for this message only.",
      indicators: completed,
      concernTypes:
        completed.length === 0
          ? []
          : [{ type: "privacy_exposure", indicatorIds: completed.map((item) => item.id) }],
      safeActions: [
        {
          title: "Check another way",
          explanation: "Use a channel you already trust.",
        },
      ],
      limitations: "This result cannot prove who sent the message.",
    }),
  };
}

const secretTail = "UNIQUE-NOT-IN-EXCERPTS";

describe("report builder", () => {
  it("uses the same sections for the rendered report and the copied text", () => {
    const message = `Please send your password.\n${secretTail}`;
    const sections = buildReport({
      message,
      result: result("ai", [
        {
          category: "sensitive_information",
          evidence: "send your password",
          explanation: "This asks for a password.",
          confidence: "high",
        },
      ]),
      includeMessage: false,
    });
    const text = formatReport(sections);
    const html = renderToStaticMarkup(<ReportDocument sections={sections} />);

    for (const section of sections) {
      assert.equal(text.includes(section.heading), true);
      assert.equal(html.includes(section.heading), true);
      for (const paragraph of section.paragraphs) {
        assert.equal(text.includes(paragraph), true);
        assert.equal(html.includes(paragraph), true);
      }
    }
    assert.equal(text.includes(secretTail), false);
    assert.equal(html.includes(secretTail), false);
    assert.equal(text.includes(reportDisclaimer), true);
    assert.equal(text.includes(excerptSensitivityCopy), true);
    assert.equal(text.includes("police"), false);
    assert.equal(text.includes("case number"), false);
  });

  it("labels AI and rules provenance differently", () => {
    const message = "Please send your password.";
    const indicator = {
      category: "sensitive_information" as const,
      evidence: "send your password",
      explanation: "This asks for a password.",
      confidence: "high" as const,
    };
    const ai = formatReport(
      buildReport({ message, result: result("ai", [indicator]), includeMessage: false }),
    );
    const rules = formatReport(
      buildReport({
        message,
        result: result("rules", [indicator]),
        includeMessage: false,
      }),
    );
    assert.match(ai, /AI-assisted analysis/);
    assert.equal(ai.includes("Limited rules-based analysis"), false);
    assert.equal(ai.includes("comes from limited rules"), false);
    assert.match(rules, /Limited rules-based analysis/);
    assert.match(rules, /AI analysis is not configured/);
    assert.match(rules, /comes from limited rules/);
    assert.match(ai, /High concern/);
    assert.match(ai, /stronger warning signs/);
    assert.match(ai, /Based on the message text and your reported context/);
    assert.match(ai, /Concern index/);
    assert.match(ai, /45/);
    assert.match(ai, /Heuristic warning-sign index, not a probability of fraud or harm/);
    assert.match(ai, /Privacy exposure/);
    assert.match(ai, /Direct textual support/);
    assert.match(ai, /concern-index-v2/);
    assert.match(ai, /Context considered/);
    assert.match(ai, /User-provided/);
    assert.match(ai, /does not verify the sender/);
    assert.match(ai, /not scientifically validated/);
    assert.match(rules, /send your password/);
    assert.match(rules, /Check another way/);
    assert.match(rules, /This result cannot prove who sent the message/);
  });

  it("describes an empty indicator list without inventing an excerpt", () => {
    const text = formatReport(
      buildReport({
        message: "Hello from a neighbor.",
        result: result("rules"),
        includeMessage: false,
      }),
    );
    assert.match(text, /More context needed/);
    assert.match(text, /Insufficient evidence to score/);
    assert.match(text, /No potential concern type was linked/);
    assert.match(text, /Insufficient evidence/);
    assert.equal(text.includes("\n0\n"), false);
    assert.match(text, /No warning signs were selected/);
    assert.match(text, /Context considered/);
    assert.equal(text.includes("Excerpt 1"), false);
    assert.equal(text.includes("Hello from a neighbor."), false);
  });

  it("includes the full message only when asked", () => {
    const message = `<script>alert(1)</script>\nhttps://tracking.example/status\n${secretTail}`;
    const hidden = buildReport({
      message,
      result: result("ai"),
      includeMessage: false,
    });
    const shown = buildReport({
      message,
      result: result("ai"),
      includeMessage: true,
    });
    assert.equal(formatReport(hidden).includes(secretTail), false);
    assert.equal(formatReport(shown).includes(message), true);

    const html = renderToStaticMarkup(<ReportDocument sections={shown} />);
    assert.equal(html.includes("<script>"), false);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.equal(/<a[\s>]/.test(html), false);
    assert.match(html, /https:\/\/tracking\.example\/status/);
  });

  it("labels a no-specific-concern result without calling it safe", () => {
    const benign = result("ai");
    benign.analysis = finalizeAnalysis({
      summary: "No specific warning signs identified in this message.",
      indicators: [],
      concernTypes: [],
      safeActions: [],
      limitations: "This does not verify the sender.",
      unscoredReading: "no_specific_concern",
    });
    benign.context = { apparentSender: "friend_or_family", expected: "yes" };
    const text = formatReport(buildReport({ message: "Hello", result: benign, includeMessage: false }));
    assert.match(text, /Looks routine/);
    assert.match(text, /No specific warning signs were identified/);
    assert.match(text, new RegExp(noSpecificConcernEvidenceCopy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(text, /Friend or family/);
    assert.match(text, /Who this appears to be from/);
    assert.match(text, /Insufficient evidence to score/);
    assert.match(text, /Insufficient evidence/);
    assert.equal(text.includes("Potential concern types"), false);
    assert.equal(text.includes("guaranteed safe"), true);
    assert.equal(text.includes("\nFriend or family\n"), false);
    assert.equal(text.includes("Excerpt 1"), false);
  });

  it("reports a clipboard failure without throwing", async () => {
    const copied = await writeReport("plain report", async (value) => {
      assert.equal(value, "plain report");
    });
    const failed = await writeReport("plain report", async () => {
      throw new Error("clipboard denied");
    });
    assert.equal(copied, "copied");
    assert.equal(failed, "failed");
  });
});
