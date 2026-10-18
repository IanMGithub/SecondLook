import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { learnPatterns, learnPlaybook, learnSources } from "./learn-content";

describe("learn content", () => {
  it("covers the pattern set and the playbook without a detection score", () => {
    assert.deepEqual(
      learnPatterns.map((pattern) => pattern.id),
      ["urgency", "impersonation", "credentials", "payment", "overpayment", "links"],
    );
    assert.equal(learnPlaybook.length, 5);
    const text = [...learnPatterns.flatMap((pattern) => [
      pattern.title,
      pattern.summary,
      pattern.example,
      pattern.watchFor,
      pattern.verify,
      pattern.details,
    ]), ...learnPlaybook].join("\n");
    assert.match(text, /does not by itself prove fraud/);
    assert.match(text, /correct spelling and grammar/);
    assert.equal(text.includes("%"), false);
    assert.equal(/always a scam/i.test(text), false);
    assert.equal(text.includes("police report"), false);
    assert.match(text, /harbor-parcel\.example/);
    assert.equal(text.includes("http://"), false);
    for (const pattern of learnPatterns) {
      assert.equal(pattern.summary.includes("."), true);
      assert.equal(pattern.watchFor.trim().length > 0, true);
      assert.equal(pattern.verify.trim().length > 0, true);
      assert.equal(pattern.details.trim().length > 0, true);
    }
  });

  it("links only to the FTC and CISA pages used for the descriptions", () => {
    assert.deepEqual(
      learnSources.map((source) => source.href),
      [
        "https://consumer.ftc.gov/articles/how-avoid-scam",
        "https://consumer.ftc.gov/articles/gift-card-scams",
        "https://consumer.ftc.gov/articles/how-spot-avoid-and-report-fake-check-scams",
        "https://www.cisa.gov/secure-our-world/recognize-and-report-phishing",
      ],
    );
  });
});
