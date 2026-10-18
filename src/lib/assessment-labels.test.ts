import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assessmentExplanations,
  assessmentLabels,
  assessments,
} from "./analysis";

describe("assessment headlines", () => {
  it("maps every assessment to the shared friendly label and explanation", () => {
    assert.deepEqual([...assessments], [
      "high_concern",
      "some_concern",
      "no_specific_concern",
      "unclear",
    ]);
    assert.equal(assessmentLabels.high_concern, "High concern");
    assert.equal(assessmentLabels.some_concern, "Double-check");
    assert.equal(assessmentLabels.no_specific_concern, "Looks routine");
    assert.equal(assessmentLabels.unclear, "More context needed");
    for (const assessment of assessments) {
      assert.equal(assessmentExplanations[assessment].trim().length > 0, true);
    }
    assert.match(assessmentExplanations.no_specific_concern, /No specific warning signs/);
    assert.match(assessmentExplanations.no_specific_concern, /does not verify the sender/);
    assert.match(assessmentExplanations.no_specific_concern, /guarantee the message is safe/);
  });
});
