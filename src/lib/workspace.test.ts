import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { finalizeAnalysis } from "./concern-rubric";
import { defaultMessageContext, type AnalyzeSuccess, type MessageContext } from "./contract";
import { analysisStatusCopy } from "./analyze-request";
import {
  applyExample,
  beginAnalysis,
  clearWorkspace,
  editMessage,
  finishAnalysis,
  idleWorkspace,
  showInput,
  updateContext,
  updateMessage,
} from "./workspace";

function success(mode: AnalyzeSuccess["mode"]): AnalyzeSuccess {
  return {
    ok: true,
    mode,
    context: { ...defaultMessageContext },
    ...(mode === "rules" ? { fallbackReason: "timeout" as const } : {}),
    analysis: finalizeAnalysis({
      summary: "Summary for this snapshot only.",
      indicators: [],
      concernTypes: [],
      safeActions: [
        {
          title: "Compare it with what you already know",
          explanation: "Compare the note with what you already expect.",
        },
      ],
      limitations: "This result cannot prove who sent the message.",
    }),
  };
}

const family: MessageContext = { apparentSender: "friend_or_family", expected: "yes" };

describe("workspace transitions", () => {
  it("starts from an empty input and can show a draft", () => {
    assert.deepEqual(idleWorkspace(), {
      phase: "input",
      message: "",
      context: defaultMessageContext,
      notice: null,
    });
    assert.deepEqual(showInput("  draft  ", family), {
      phase: "input",
      message: "  draft  ",
      context: family,
      notice: null,
    });
  });

  it("moves from input to loading with the exact submitted text and context", () => {
    const started = beginAnalysis("  Please send your password.  ", family);
    assert.equal(started.status, "ready");
    if (started.status !== "ready") return;
    assert.deepEqual(started.submitted, {
      message: "  Please send your password.  ",
      context: family,
    });
    assert.deepEqual(started.workspace, {
      phase: "loading",
      message: "  Please send your password.  ",
      context: family,
    });
  });

  it("keeps invalid text and the selected context on the form", () => {
    const blank = beginAnalysis("   ", family);
    assert.equal(blank.status, "invalid");
    if (blank.status !== "invalid") return;
    assert.equal(blank.workspace.message, "   ");
    assert.deepEqual(blank.workspace.context, family);
    assert.deepEqual(blank.workspace.notice, { type: "invalid", reason: "empty" });
  });

  it("replaces the workspace with a result for the current request", () => {
    const result = success("ai");
    result.context = family;
    const next = finishAnalysis(
      3,
      3,
      { message: "  Please send your password.  ", context: family },
      { type: "success", result },
    );
    assert.equal(next?.phase, "result");
    if (next?.phase !== "result") return;
    assert.equal(next.message, "  Please send your password.  ");
    assert.deepEqual(next.context, family);
    assert.equal(next.result.mode, "ai");
  });

  it("returns to the form with the submitted text and context after an error", () => {
    const next = finishAnalysis(
      3,
      3,
      { message: "  Please send your password.  ", context: family },
      { type: "error", message: analysisStatusCopy.network },
    );
    assert.deepEqual(next, {
      phase: "input",
      message: "  Please send your password.  ",
      context: family,
      notice: { type: "error", message: analysisStatusCopy.network },
    });
  });

  it("ignores an older or aborted outcome", () => {
    assert.equal(
      finishAnalysis(
        4,
        3,
        { message: "older", context: family },
        { type: "success", result: success("rules") },
      ),
      null,
    );
    assert.equal(
      finishAnalysis(4, 4, { message: "current", context: family }, { type: "aborted" }),
      null,
    );
  });

  it("restores the submitted text and context, and a new analysis clears both", () => {
    const result = success("rules");
    result.context = family;
    const settled = finishAnalysis(
      1,
      1,
      { message: "  exact snapshot  ", context: family },
      { type: "success", result },
    );
    assert.ok(settled);
    assert.deepEqual(editMessage(settled), {
      phase: "input",
      message: "  exact snapshot  ",
      context: family,
      notice: null,
    });
    assert.deepEqual(clearWorkspace(), idleWorkspace());
  });

  it("drops a result when context changes and does not let an example keep the old context", () => {
    const current = showInput("Can you send me a photo from the picnic?", family);
    const changed = updateContext(current, {
      apparentSender: "unknown_sender",
      expected: "no",
    });
    assert.equal(changed.phase, "input");
    if (changed.phase !== "input") return;
    assert.equal(changed.message, current.message);
    assert.deepEqual(changed.context, {
      apparentSender: "unknown_sender",
      expected: "no",
    });

    const typed = updateMessage(changed, "Edited text");
    assert.equal(typed.phase, "input");
    if (typed.phase !== "input") return;
    assert.deepEqual(typed.context, changed.context);

    const example = applyExample("Reminder: Your appointment is tomorrow at 10 AM.");
    assert.equal(example.phase, "input");
    if (example.phase !== "input") return;
    assert.equal(example.message.includes("appointment"), true);
    assert.deepEqual(example.context, defaultMessageContext);
  });
});
