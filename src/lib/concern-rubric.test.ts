import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONCERN_LABEL_THRESHOLD, type Indicator } from "./contract";
import {
  dedupeDraft,
  finalizeAnalysis,
  type AnalysisDraft,
} from "./concern-rubric";

function indicator(
  id: string,
  evidence: string,
  severity: Indicator["severity"],
  support: Indicator["support"] = "direct",
  confidence: Indicator["confidence"] = "high",
): Indicator {
  return {
    id,
    category: "other",
    evidence,
    explanation: "The excerpt is the warning sign.",
    confidence,
    severity,
    support,
  };
}

function draft(
  indicators: Indicator[],
  ids = indicators.map((item) => item.id),
): AnalysisDraft {
  return {
    summary: "Summary for the rubric.",
    indicators,
    concernTypes: ids.length === 0 ? [] : [{ type: "scam_fraud", indicatorIds: ids }],
    safeActions: [],
    limitations: "This score is a product-design heuristic.",
  };
}

describe("concern index rubric", () => {
  it("leaves an empty analysis unscored", () => {
    const analysis = finalizeAnalysis(draft([]));
    assert.equal(analysis.concernIndex, null);
    assert.equal(analysis.assessment, "unclear");
    assert.equal(analysis.evidenceStrength, "insufficient");
    assert.deepEqual(analysis.concernTypes, []);
    assert.match(analysis.evidenceStrengthNote, /not a finding that the message is safe/);
  });

  it("uses no specific concern only for an explicit empty reading", () => {
    const benign = finalizeAnalysis({
      ...draft([]),
      unscoredReading: "no_specific_concern",
    });
    assert.equal(benign.assessment, "no_specific_concern");
    assert.equal(benign.concernIndex, null);
    assert.equal(benign.evidenceStrength, "insufficient");

    const ignored = finalizeAnalysis({
      ...draft([indicator("i1", "send your password", "high")]),
      unscoredReading: "no_specific_concern",
    });
    assert.equal(ignored.assessment, "high_concern");
    assert.equal(ignored.concernIndex, 45);

    const unlinked = finalizeAnalysis({
      ...draft([indicator("i1", "send your password", "high")], []),
      concernTypes: [],
      unscoredReading: "no_specific_concern",
    });
    assert.equal(unlinked.assessment, "unclear");
    assert.equal(unlinked.indicators.length, 1);
  });

  it("does not score an indicator that no concern type cites", () => {
    const analysis = finalizeAnalysis({
      ...draft([indicator("i1", "send your password", "high")], []),
      concernTypes: [],
    });
    assert.equal(analysis.concernIndex, null);
    assert.equal(analysis.assessment, "unclear");
    assert.equal(analysis.indicators.length, 1);
  });

  it("keeps the label on the same threshold as the index", () => {
    const some = finalizeAnalysis(draft([indicator("i1", "account will be restricted", "moderate")]));
    const high = finalizeAnalysis(
      draft([
        indicator("i1", "account will be restricted", "moderate", "direct"),
        indicator("i2", "in 30 minutes", "moderate", "contextual"),
      ]),
    );
    assert.equal(CONCERN_LABEL_THRESHOLD, 40);
    assert.equal(some.concernIndex, 30);
    assert.equal(some.assessment, "some_concern");
    assert.equal(high.concernIndex, 45);
    assert.equal(high.assessment, "high_concern");
  });

  it("caps repeated distinct excerpts and does not count one excerpt twice", () => {
    const three = finalizeAnalysis(
      draft([
        indicator("i1", "send your password", "high"),
        indicator("i2", "buy a gift card", "high"),
        indicator("i3", "send your home address", "high"),
      ]),
    );
    assert.equal(three.concernIndex, 67);

    const repeated = finalizeAnalysis(
      draft([
        indicator("i1", "send your password", "high"),
        indicator("i2", "send your password", "high", "direct", "low"),
      ]),
    );
    assert.equal(repeated.concernIndex, 45);
  });

  it("does not use interpretation confidence as a score multiplier", () => {
    const high = finalizeAnalysis(
      draft([indicator("i1", "send your password", "high", "direct", "high")]),
    );
    const low = finalizeAnalysis(
      draft([indicator("i1", "send your password", "high", "direct", "low")]),
    );
    assert.equal(high.concernIndex, low.concernIndex);
    assert.equal(high.concernIndex, 45);
  });

  it("separates evidence strength from severity", () => {
    const analysis = finalizeAnalysis(
      draft([indicator("i1", "send your password", "high", "contextual")]),
    );
    assert.equal(analysis.concernIndex, 45);
    assert.equal(analysis.evidenceStrength, "context_dependent");
    assert.match(analysis.evidenceStrengthNote, /not a measure of certainty/);
  });

  it("retargets a duplicate excerpt onto the kept indicator id", () => {
    const deduped = dedupeDraft(
      draft([
        indicator("i1", "send your password", "high"),
        indicator("i2", "send your password", "high"),
      ]),
    );
    const analysis = finalizeAnalysis(deduped);
    assert.deepEqual(
      analysis.indicators.map((item) => item.id),
      ["i1"],
    );
    assert.deepEqual(analysis.concernTypes[0]?.indicatorIds, ["i1"]);
    assert.equal(analysis.concernIndex, 45);
  });
});
