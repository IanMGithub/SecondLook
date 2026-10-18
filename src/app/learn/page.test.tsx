import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import LearnPage from "./page";

describe("Learn page", () => {
  it("renders patterns, the playbook, and official source links as text-backed cards", () => {
    const html = renderToStaticMarkup(<LearnPage />);
    assert.match(html, /href="#common-scams"/);
    assert.match(html, /href="#verification-playbook"/);
    assert.match(html, /id="common-scams"/);
    assert.match(html, /id="verification-playbook"/);
    assert.match(html, /Common scams guide/);
    assert.match(html, /Urgency and threats/);
    assert.match(html, /Impersonation/);
    assert.match(html, /Password and verification-code requests/);
    assert.match(html, /Gift-card and crypto payment demands/);
    assert.match(html, /Overpayment and refund requests/);
    assert.match(html, /Unexpected links and login requests/);
    assert.match(html, /Watch for/);
    assert.match(html, /Verify/);
    assert.match(html, /More context/);
    assert.match(html, /Quick verification playbook/);
    assert.match(html, /Pause before acting/);
    assert.match(html, /href="https:\/\/consumer\.ftc\.gov\/articles\/how-avoid-scam"/);
    assert.match(html, /href="https:\/\/www\.cisa\.gov\/secure-our-world\/recognize-and-report-phishing"/);
    assert.equal(html.includes('href="https://harbor-parcel.example'), false);
    assert.equal(/role="tab"/.test(html), false);
    assert.match(html, /<svg/);
    assert.match(html, /do not decide whether a message you received is fraudulent/);
  });
});
