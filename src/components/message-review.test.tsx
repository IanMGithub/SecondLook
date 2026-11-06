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
  it("defaults to the demo practice picker", () => {
    const html = renderToStaticMarkup(<MessageReview />);
    assert.match(html, /Analyze example/);
    assert.match(html, /Practice messages/);
    assert.equal(html.includes("Analyze message"), false);
    assert.equal(html.includes("may be processed by OpenAI"), false);
  });

  it("offers live analysis when deploymentMode is live", () => {
    const html = renderToStaticMarkup(<MessageReview deploymentMode="live" />);
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
    assert.match(html, /Analyzing the message/);
    assert.match(html, /aria-busy="true"/);
    assert.match(html, /Cancel/);
    assert.equal(html.includes("Analyze message"), false);
    assert.equal(html.includes("Message to analyze"), false);
  });

  it("shows result actions and keeps the submitted message out of the heading", () => {
    const html = renderToStaticMarkup(
      <WorkspaceView
        workspace={{
          phase: "result",
          message: "Please send your password.",
          context: defaultMessageContext,
          result: success("rules"),
        }}
        {...handlers()}
      />,
    );
    assert.match(html, /Analysis result/);
    assert.match(html, /Edit message/);
    assert.match(html, /New analysis/);
    assert.match(html, /Create report/);
    assert.match(html, /Limited rules-based analysis/);
    assert.equal(html.includes(analysisStatusCopy.network), false);
  });
});
