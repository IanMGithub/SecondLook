import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resourceGroups,
  resourcesBankGuidance,
  resourcesDirectoryNote,
  resourcesEmergencyNote,
} from "./resources-content";

describe("resources directory", () => {
  it("keeps the fixed U.S. URLs and does not transfer a message", () => {
    assert.match(resourcesDirectoryNote, /U\.S\. resources/);
    assert.match(resourcesDirectoryNote, /does not submit a report/);
    assert.match(resourcesDirectoryNote, /send your message/);
    assert.match(resourcesBankGuidance.text, /bank or payment provider promptly/);
    assert.equal(
      resourcesBankGuidance.sourceHref,
      "https://consumer.ftc.gov/articles/what-do-if-you-were-scammed",
    );
    assert.match(resourcesEmergencyNote, /immediate danger/);
    assert.match(resourcesEmergencyNote, /911/);
    assert.match(resourcesEmergencyNote, /United States/);

    const hrefs = resourceGroups.flatMap((group) => group.links.map((link) => link.href));
    assert.deepEqual(hrefs, [
      "https://reportfraud.ftc.gov/",
      "https://www.ic3.gov/",
      "https://www.usa.gov/where-report-scams",
      "https://www.identitytheft.gov/",
      "https://consumer.ftc.gov/articles/what-do-if-you-were-scammed",
      "https://consumer.ftc.gov/scams",
    ]);
    assert.deepEqual(
      resourceGroups.map((group) => group.id),
      ["report", "recover", "learn"],
    );
    for (const group of resourceGroups) {
      for (const link of group.links) {
        assert.equal(link.name.trim().length > 0, true);
        assert.equal(link.whenUseful.trim().length > 0, true);
        assert.equal(link.linkLabel.trim().length > 0, true);
        assert.equal(link.href.includes("message="), false);
        assert.equal(link.href.includes("body="), false);
      }
    }
  });
});
