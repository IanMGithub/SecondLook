import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AnalysisResult } from "../components/analysis-result";
import { MessageReview } from "../components/message-review";
import { demoProvenanceText } from "./analyze-request";
import { analyzeSuccessSchema } from "./contract";
import {
  demoAnalyzeSuccess,
  exampleFixtures,
  getExampleFixture,
} from "./fixtures";
import { evidenceOccursLiterally } from "./validate-evidence";

describe("demo practice fixtures", () => {
  it("covers four representative practice cases with valid envelopes", () => {
    assert.equal(exampleFixtures.length, 4);
    const ids = exampleFixtures.map((fixture) => fixture.id);
    assert.deepEqual(ids, [
      "urgent-account",
      "it-support-impersonation",
      "routine-reminder",
      "wifi-password-request",
    ]);

    for (const fixture of exampleFixtures) {
      const envelope = demoAnalyzeSuccess(fixture);
      assert.equal(analyzeSuccessSchema.safeParse(envelope).success, true);
      assert.equal(envelope.mode, "demo");
      assert.equal("fallbackReason" in envelope, false);
      for (const indicator of fixture.analysis.indicators) {
        assert.equal(
          evidenceOccursLiterally(fixture.message, indicator.evidence),
          true,
        );
      }
    }
  });

  it("ignores unknown example ids", () => {
    assert.equal(getExampleFixture("not-a-real-id"), undefined);
    assert.equal(getExampleFixture(""), undefined);
  });

  it("renders each fixture through the existing results layout", () => {
    for (const fixture of exampleFixtures) {
      const html = renderToStaticMarkup(
        <AnalysisResult
          message={fixture.message}
          result={demoAnalyzeSuccess(fixture)}
        />,
      );
      assert.match(html, /Prewritten demo assessment/);
      assert.match(html, new RegExp(demoProvenanceText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(html, /Assessment details|Full limitations|Safer next steps|Looks routine|Double-check|High concern|More context needed/);
    }
  });

  it("shows the demo picker and not freeform live analysis controls", () => {
    const html = renderToStaticMarkup(<MessageReview deploymentMode="demo" />);
    assert.match(html, /Analyze example/);
    assert.match(html, /Practice messages/);
    assert.match(html, /does not call an AI service/);
    assert.match(html, /Urgent account warning/);
    assert.match(html, /IT support urgency/);
    assert.match(html, /Routine reminder/);
    assert.match(html, /Password request from a contact/);
    assert.equal(html.includes("Analyze message"), false);
    assert.equal(html.includes("Message to analyze"), false);
    assert.equal(html.includes("may be processed by OpenAI"), false);
    assert.equal(html.includes('aria-busy="true"'), false);
  });
});
