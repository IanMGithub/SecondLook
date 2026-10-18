import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { finalizeAnalysis } from "../lib/concern-rubric";
import { defaultMessageContext, type AnalyzeSuccess } from "../lib/contract";
import { analysisStatusCopy } from "../lib/analyze-request";
import { MessageReview, WorkspaceView } from "./message-review";

const noop = () => undefined;

function handlers() {
  return {
    onSubmit: (event: { preventDefault: () => void }) => event.preventDefault(),
    onMessageChange: noop,
    onContextChange: noop,
    onClear: noop,
    onExample: noop,
    onCancel: noop,
    onEdit: noop,
    onNew: noop,
  };
}

function success(mode: AnalyzeSuccess["mode"]): AnalyzeSuccess {
  return {
    ok: true,
    mode,
    context: { ...defaultMessageContext },
    ...(mode === "rules" ? { fallbackReason: "timeout" as const } : {}),
    analysis: finalizeAnalysis({
      summary: "Rules summary only.",
      indicators: [],
      concernTypes: [],
      safeActions: [],
      limitations: "Limited rules only for this result.",
    }),
  };
}

describe("MessageReview initial markup", () => {
  it("offers live analysis and does not show a mock result", () => {
    const html = renderToStaticMarkup(<MessageReview />);
    assert.match(html, /Analyze message/);
    assert.match(html, /The message and these context labels are sent to our server/);
    assert.match(html, /Who does this appear to be from/);
    assert.match(html, /Were you expecting this message/);
    assert.match(
      html,
      /Context helps interpret the message, but does not verify the sender/,
    );
    assert.match(html, /Friend or family/);
    assert.match(html, /Unknown sender/);
    assert.match(html, /does not intentionally save or log/);
    assert.match(html, /does not guarantee a model request stops/);
    assert.match(html, /Fictional: Urgent account warning/);
    assert.match(html, /does not analyze it/);
    assert.match(html, /No analysis yet/);
    assert.match(html, /discards the message, the context/);
    assert.match(html, /They are not saved/);
    assert.equal(html.includes("Create report"), false);
    assert.equal(html.includes("Edit message"), false);
    assert.equal(html.includes("Mock analysis"), false);
    assert.equal(html.includes("Preview analysis"), false);
    assert.equal(html.includes("Live analysis is not connected"), false);
    assert.equal(html.includes("aria-busy=\"true\""), false);
  });
});

describe("workspace markup", () => {
  it("replaces the form while a request is running", () => {
    const html = renderToStaticMarkup(
      <WorkspaceView
        workspace={{
          phase: "loading",
          message: "Please send your password.",
          context: defaultMessageContext,
        }}
        {...handlers()}
      />,
    );
    assert.match(html, /aria-busy="true"/);
    assert.match(html, /Analyzing the message/);
    assert.match(html, /Cancel/);
    assert.equal(html.includes("<textarea"), false);
    assert.equal(html.includes("Create report"), false);
    assert.equal(html.includes("Fictional examples"), false);
  });

  it("keeps the form and the submitted text when analysis fails", () => {
    const html = renderToStaticMarkup(
      <WorkspaceView
        workspace={{
          phase: "input",
          message: "  exact submitted text  ",
          context: { apparentSender: "work_or_school", expected: "yes" },
          notice: { type: "error", message: analysisStatusCopy.unreadable },
        }}
        {...handlers()}
      />,
    );
    assert.match(html, /<textarea/);
    assert.match(html, /exact submitted text/);
    assert.match(html, /role="alert"/);
    assert.match(html, /Work or school contact/);
    assert.match(html, /value="yes"/);
    assert.match(html, /could not be read/);
    assert.equal(html.includes("Analysis result"), false);
    assert.equal(html.includes("No analysis yet"), false);
  });

  it("replaces the form with a result and an empty indicator list", () => {
    const message = '<script>alert(1)</script> https://tracking.example/status';
    const html = renderToStaticMarkup(
      <WorkspaceView
        workspace={{
          phase: "result",
          message,
          context: defaultMessageContext,
          result: success("rules"),
        }}
        {...handlers()}
      />,
    );
    assert.match(html, /Analysis result/);
    assert.match(html, /tabindex="-1"/);
    assert.match(html, /Edit message/);
    assert.match(html, /New analysis/);
    assert.match(html, /Create report/);
    assert.match(html, /Limited rules-based analysis/);
    assert.match(html, /AI analysis took too long/);
    assert.match(html, /No warning signs were selected/);
    assert.match(html, /Include the full message/);
    assert.match(html, /Copy report/);
    assert.match(html, /Close/);
    assert.equal(html.includes("<textarea"), false);
    assert.equal(html.includes('role="alert"'), false);
    assert.equal(html.includes("<script>"), false);
    assert.equal(/<a[\s>]/.test(html), false);
    assert.match(html, /https:\/\/tracking\.example\/status/);
  });
});
