"use client";

import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { AnalysisResult } from "@/components/analysis-result";
import { ReportDialog } from "@/components/report-dialog";
import {
  analysisStatusCopy,
  requestAnalysis,
  type AnalysisRequestOutcome,
} from "@/lib/analyze-request";
import { defaultMessageContext, MESSAGE_LIMIT, type MessageContext } from "@/lib/contract";
import { examplePrompts } from "@/lib/examples";
import {
  isApparentSender,
  isMessageExpectation,
} from "@/lib/analysis";
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
  type Workspace,
} from "@/lib/workspace";

type FocusIntent = "result" | "loading" | "input" | null;

export function MessageReview() {
  const [workspace, setWorkspace] = useState<Workspace>(idleWorkspace);
  const requestRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const focusIntent = useRef<FocusIntent>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const loadingHeadingRef = useRef<HTMLHeadingElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    return () => {
      requestRef.current += 1;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const intent = focusIntent.current;
    if (!intent) return;
    if (intent === "result" && workspace.phase === "result") {
      resultsHeadingRef.current?.focus({ preventScroll: true });
      focusIntent.current = null;
    } else if (intent === "loading" && workspace.phase === "loading") {
      loadingHeadingRef.current?.focus({ preventScroll: true });
      focusIntent.current = null;
    } else if (intent === "input" && workspace.phase === "input") {
      textareaRef.current?.focus({ preventScroll: true });
      focusIntent.current = null;
    }
  }, [workspace]);

  function cancelPending() {
    requestRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
  }

  function replaceMessage(next: string) {
    cancelPending();
    setWorkspace((current) => updateMessage(current, next));
  }

  function replaceContext(context: MessageContext) {
    cancelPending();
    setWorkspace((current) => updateContext(current, context));
  }

  function applyOutcome(
    requestId: number,
    submittedMessage: string,
    submittedContext: MessageContext,
    outcome: AnalysisRequestOutcome,
  ) {
    const next = finishAnalysis(
      requestRef.current,
      requestId,
      { message: submittedMessage, context: submittedContext },
      outcome,
    );
    if (!next) return;
    if (next.phase === "result") focusIntent.current = "result";
    if (next.phase === "input") focusIntent.current = "input";
    setWorkspace(next);
  }

  function analyzeMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (workspace.phase === "loading") return;
    const draft = workspace.phase === "input" ? workspace.message : "";
    const context = workspace.phase === "input" ? workspace.context : defaultMessageContext;
    cancelPending();

    const started = beginAnalysis(draft, context);
    if (started.status === "invalid") {
      setWorkspace(started.workspace);
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const controller = new AbortController();
    abortRef.current = controller;
    focusIntent.current = "loading";
    setWorkspace(started.workspace);

    void requestAnalysis(
      started.submitted.message,
      started.submitted.context,
      controller.signal,
    ).then((outcome) => {
      applyOutcome(
        requestId,
        started.submitted.message,
        started.submitted.context,
        outcome,
      );
    });
  }

  return (
    <div className="space-y-4">
      <p id="message-memory" className="text-sm leading-6 text-stone-600">
        Opening Learn leaves this page and discards the message, the context,
        and any result held in memory. They are not saved.
      </p>
      <WorkspaceView
        workspace={workspace}
        textareaRef={textareaRef}
        loadingHeadingRef={loadingHeadingRef}
        resultsHeadingRef={resultsHeadingRef}
        onSubmit={analyzeMessage}
        onMessageChange={replaceMessage}
        onContextChange={replaceContext}
        onClear={() => {
          cancelPending();
          setWorkspace(showInput("", { ...defaultMessageContext }));
        }}
        onExample={(message) => {
          cancelPending();
          setWorkspace(applyExample(message));
        }}
        onCancel={() => {
          if (workspace.phase !== "loading") return;
          cancelPending();
          focusIntent.current = "input";
          setWorkspace(showInput(workspace.message, workspace.context));
        }}
        onEdit={() => {
          cancelPending();
          focusIntent.current = "input";
          setWorkspace(editMessage(workspace));
        }}
        onNew={() => {
          cancelPending();
          focusIntent.current = "input";
          setWorkspace(clearWorkspace());
        }}
      />
    </div>
  );
}

export function WorkspaceView({
  workspace,
  textareaRef,
  loadingHeadingRef,
  resultsHeadingRef,
  onSubmit,
  onMessageChange,
  onContextChange,
  onClear,
  onExample,
  onCancel,
  onEdit,
  onNew,
}: {
  workspace: Workspace;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  loadingHeadingRef?: RefObject<HTMLHeadingElement | null>;
  resultsHeadingRef?: RefObject<HTMLHeadingElement | null>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onMessageChange: (message: string) => void;
  onContextChange: (context: MessageContext) => void;
  onClear: () => void;
  onExample: (message: string) => void;
  onCancel: () => void;
  onEdit: () => void;
  onNew: () => void;
}) {
  if (workspace.phase === "loading") {
    return (
      <section
        aria-busy="true"
        aria-labelledby="loading-heading"
        className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 sm:p-7"
      >
        <h2
          id="loading-heading"
          ref={loadingHeadingRef}
          tabIndex={-1}
          className="text-2xl font-semibold tracking-tight text-stone-950 focus:outline-2 focus:outline-offset-[3px] focus:outline-accent"
        >
          Analyzing the message.
        </h2>
        <p role="status" className="sr-only">
          Analyzing the message.
        </p>
        <p id="message-cancel" className="text-sm leading-6 text-stone-600">
          Cancel returns to your message and stops the request in this browser.
          Leaving this page does too. That does not guarantee a model request
          stops or avoids a charge.
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800"
        >
          Cancel
        </button>
      </section>
    );
  }

  if (workspace.phase === "result") {
    return (
      <section className="min-w-0 rounded-3xl border border-stone-200 bg-white p-5 sm:p-7">
        <p role="status" className="sr-only">
          Analysis ready.
        </p>
        <h2
          id="analysis-result-heading"
          ref={resultsHeadingRef}
          tabIndex={-1}
          className="text-2xl font-semibold tracking-tight text-stone-950 focus:outline-2 focus:outline-offset-[3px] focus:outline-accent"
        >
          Analysis result
        </h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800"
          >
            Edit message
          </button>
          <button
            type="button"
            onClick={onNew}
            className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800"
          >
            New analysis
          </button>
          <ReportDialog message={workspace.message} result={workspace.result} />
        </div>
        <div className="mt-8">
          <AnalysisResult message={workspace.message} result={workspace.result} />
        </div>
      </section>
    );
  }

  const describedBy = [
    "message-privacy",
    "message-retention",
    "message-memory",
    "message-count",
    workspace.notice ? "message-error" : null,
  ]
    .filter((id) => id !== null)
    .join(" ");
  const limitReached = workspace.message.length >= MESSAGE_LIMIT;

  return (
    <div className="space-y-8">
      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-3xl border border-stone-200 bg-white p-5 sm:p-7"
        noValidate
      >
        <div className="space-y-2">
          <label
            htmlFor="message"
            className="block text-base font-semibold text-stone-950"
          >
            Message to analyze
          </label>
          <textarea
            id="message"
            ref={textareaRef}
            value={workspace.message}
            onChange={(event) => onMessageChange(event.target.value)}
            maxLength={MESSAGE_LIMIT}
            rows={8}
            autoComplete="off"
            spellCheck
            aria-invalid={workspace.notice?.type === "invalid"}
            aria-describedby={describedBy}
            placeholder="Paste a text message or email you want to understand."
            className="w-full resize-y rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base leading-7 text-stone-950 [overflow-wrap:anywhere] placeholder:text-stone-400"
          />
          <p id="message-privacy" className="text-sm leading-6 text-stone-600">
            The message and these context labels are sent to our server for
            analysis and may be processed by OpenAI. Remove passwords,
            verification codes, account numbers, and other sensitive details
            before submitting.
          </p>
          <p id="message-retention" className="text-sm leading-6 text-stone-600">
            This app does not intentionally save or log the message or context
            you submit. Context stays in this page’s memory until you leave.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="apparent-sender"
                className="block text-sm font-semibold text-stone-950"
              >
                Who does this appear to be from?
              </label>
              <select
                id="apparent-sender"
                value={workspace.context.apparentSender}
                onChange={(event) => {
                  const value = event.target.value;
                  if (!isApparentSender(value)) return;
                  onContextChange({ ...workspace.context, apparentSender: value });
                }}
                aria-describedby="context-note"
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-950"
              >
                <option value="not_sure">Not sure</option>
                <option value="friend_or_family">Friend or family</option>
                <option value="work_or_school">Work or school contact</option>
                <option value="business_or_organization">Business or organization</option>
                <option value="unknown_sender">Unknown sender</option>
              </select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="message-expected"
                className="block text-sm font-semibold text-stone-950"
              >
                Were you expecting this message?
              </label>
              <select
                id="message-expected"
                value={workspace.context.expected}
                onChange={(event) => {
                  const value = event.target.value;
                  if (!isMessageExpectation(value)) return;
                  onContextChange({ ...workspace.context, expected: value });
                }}
                aria-describedby="context-note"
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-950"
              >
                <option value="not_sure">Not sure</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
          <p id="context-note" className="text-sm leading-6 text-stone-600">
            Context helps interpret the message, but does not verify the sender.
            These choices are labels only. Do not enter a name, phone number, or
            account number.
          </p>
          <p className="text-sm leading-6 text-stone-600">
            Changing the message, the context, choosing an example, or selecting
            Clear cancels a request still running in this browser. That does not
            guarantee a model request stops or avoids a charge.
          </p>
          <p id="message-count" className="text-sm text-stone-500">
            {workspace.message.length.toLocaleString("en-US")} / 5,000 characters
            {limitReached ? ". Character limit reached." : ""}
          </p>
          {workspace.notice ? (
            <p id="message-error" role="alert" className="text-sm font-medium text-stone-900">
              {workspace.notice.type === "invalid"
                ? workspace.notice.reason === "tooLong"
                  ? analysisStatusCopy.tooLong
                  : analysisStatusCopy.empty
                : workspace.notice.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
          >
            Analyze message
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800"
          >
            Clear
          </button>
        </div>
      </form>

      <section aria-labelledby="examples-heading" className="space-y-3">
        <div className="space-y-1">
          <h2 id="examples-heading" className="text-lg font-semibold text-stone-950">
            Fictional examples
          </h2>
          <p id="examples-note" className="text-sm leading-6 text-stone-600">
            All three messages are fictional. Choosing one fills the box, resets
            both context choices to Not sure, and does not analyze it.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {examplePrompts.map((example) => (
            <button
              key={example.id}
              type="button"
              aria-pressed={workspace.message === example.message}
              aria-describedby="examples-note"
              onClick={() => onExample(example.message)}
              className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left text-sm font-medium text-stone-800"
            >
              Fictional: {example.title}
            </button>
          ))}
        </div>
      </section>

      {workspace.notice ? null : (
        <p role="status" className="text-base leading-7 text-stone-600">
          No analysis yet. Paste a message or choose a fictional example, then
          select Analyze message.
        </p>
      )}
    </div>
  );
}
