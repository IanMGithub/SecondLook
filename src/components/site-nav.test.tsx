import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SiteNav } from "./site-nav";

describe("primary navigation", () => {
  it("uses real links and marks the current page", () => {
    const analyze = renderToStaticMarkup(<SiteNav pathname="/" />);
    const learn = renderToStaticMarkup(<SiteNav pathname="/learn" />);
    const resources = renderToStaticMarkup(<SiteNav pathname="/resources" />);
    assert.match(analyze, /href="\/"/);
    assert.match(analyze, /href="\/learn"/);
    assert.match(analyze, /href="\/resources"/);
    assert.match(analyze, /aria-current="page"/);
    assert.match(learn, /aria-current="page"/);
    assert.match(resources, /aria-current="page"/);
    assert.equal(analyze.includes('role="tab"'), false);
    assert.equal(learn.includes('role="tablist"'), false);
    assert.equal((analyze.match(/aria-current="page"/g) ?? []).length, 1);
    assert.equal((resources.match(/aria-current="page"/g) ?? []).length, 1);
    assert.match(analyze, /Analyze/);
    assert.match(learn, /Learn/);
    assert.match(resources, /Resources/);
  });
});
