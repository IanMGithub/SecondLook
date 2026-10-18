import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import ResourcesPage from "./page";

describe("Resources page", () => {
  it("renders the U.S. directory without transferring a message", () => {
    const html = renderToStaticMarkup(<ResourcesPage />);
    assert.match(html, /U\.S\. resources/);
    assert.match(html, /does not submit a report/);
    assert.match(html, /Report a scam/);
    assert.match(html, /Recover and protect yourself/);
    assert.match(html, /Learn more/);
    assert.match(html, /href="https:\/\/reportfraud\.ftc\.gov\/"/);
    assert.match(html, /href="https:\/\/www\.identitytheft\.gov\/"/);
    assert.match(html, /href="https:\/\/www\.ic3\.gov\/"/);
    assert.match(html, /href="https:\/\/www\.usa\.gov\/where-report-scams"/);
    assert.match(html, /href="https:\/\/consumer\.ftc\.gov\/scams"/);
    assert.match(html, /bank or payment provider promptly/);
    assert.match(html, /Immediate danger/);
    assert.match(html, /911/);
    assert.equal(html.includes("message="), false);
    assert.equal(html.includes("body="), false);
    assert.equal(/role="tab"/.test(html), false);
  });
});
