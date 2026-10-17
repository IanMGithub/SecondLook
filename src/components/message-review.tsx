"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnalysisPreview } from "@/components/analysis-preview";
import type { Analysis } from "@/lib/analysis";
import { exampleFixtures, findExampleAnalysis } from "@/lib/fixtures";

const MESSAGE_LIMIT = 5000;
const SIMULATED_PREVIEW_MS = 800;

type PreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "unavailable" }
  | { status: "result"; message: string; analysis: Analysis };

export function MessageReview() {
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });
  const messageRef = useRef(message);
  const requestRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function cancelPending() {
    requestRef.current += 1;
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  function replaceMessage(next: string) {
    const limited = next.slice(0, MESSAGE_LIMIT);
    messageRef.current = limited;
    cancelPending();
    setMessage(limited);
    setPreview({ status: "idle" });
  }

  function previewAnalysis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    cancelPending();

    if (message.trim().length === 0) {
      setPreview({ status: "invalid" });
      return;
    }

    const submittedMessage = message;
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setPreview({ status: "loading" });

    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      if (requestRef.current !== requestId) return;
      if (messageRef.current !== submittedMessage) return;

      const analysis = findExampleAnalysis(submittedMessage);
      if (analysis) {
        setPreview({ status: "result", message: submittedMessage, analysis });
        return;
      }

      setPreview({ status: "unavailable" });
    }, SIMULATED_PREVIEW_MS);
  }

  const describedBy = [
    "message-help",
    "message-privacy",
    "message-count",
    preview.status === "invalid" ? "message-error" : null,
  ]
    .filter((id) => id !== null)
    .join(" ");

  const limitReached = message.length >= MESSAGE_LIMIT;

  return (
    <div className="space-y-8">
      <form
        onSubmit={previewAnalysis}
        aria-busy={preview.status === "loading"}
        className="space-y-5 rounded-3xl border border-stone-200 bg-white p-5 sm:p-7"
        noValidate
      >
        <div className="space-y-2">
          <label
            htmlFor="message"
            className="block text-base font-semibold text-stone-950"
          >
            Message to review
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(event) => replaceMessage(event.target.value)}
            maxLength={MESSAGE_LIMIT}
            rows={8}
            autoComplete="off"
            spellCheck
            aria-invalid={preview.status === "invalid"}
            aria-describedby={describedBy}
            placeholder="Paste a text message or email you want to understand."
            className="w-full resize-y rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base leading-7 text-stone-950 [overflow-wrap:anywhere] placeholder:text-stone-400"
          />
          <p id="message-help" className="text-sm leading-6 text-stone-600">
            Remove passwords, verification codes, account numbers, and other
            sensitive details before pasting.
          </p>
          <p id="message-privacy" className="text-sm leading-6 text-stone-600">
            This preview keeps what you type in the page only while it stays
            open. It does not send the message to a server or save it for later.
          </p>
          <p id="message-count" className="text-sm text-stone-500">
            {message.length.toLocaleString("en-US")} / 5,000 characters
            {limitReached ? ". Character limit reached." : ""}
          </p>
          {preview.status === "invalid" ? (
            <p id="message-error" role="alert" className="text-sm font-medium text-stone-900">
              Enter a message before previewing. Spaces alone do not count.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={preview.status === "loading"}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Preview analysis
          </button>
          <button
            type="button"
            onClick={() => replaceMessage("")}
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
            All three messages are fictional. Choosing one fills the box and
            does not run the preview.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {exampleFixtures.map((example) => (
            <button
              key={example.id}
              type="button"
              aria-pressed={message === example.message}
              aria-describedby="examples-note"
              onClick={() => replaceMessage(example.message)}
              className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left text-sm font-medium text-stone-800"
            >
              Fictional: {example.title}
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="preview-heading" className="min-w-0">
        <h2 id="preview-heading" className="sr-only">
          Preview
        </h2>
        {preview.status === "idle" ? (
          <p role="status" className="text-base leading-7 text-stone-600">
            No preview yet. Choose a fictional example or paste a message, then
            select Preview analysis.
          </p>
        ) : null}
        {preview.status === "loading" ? (
          <p role="status" className="text-base leading-7 text-stone-700">
            Preparing the preview.
          </p>
        ) : null}
        {preview.status === "unavailable" ? (
          <p
            role="status"
            className="rounded-2xl border border-stone-200 bg-white px-4 py-4 text-base leading-7 text-stone-800"
          >
            Live analysis is not connected yet. Choose a fictional example to
            preview the results.
          </p>
        ) : null}
        {preview.status === "result" ? (
          <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-7">
            <AnalysisPreview
              message={preview.message}
              analysis={preview.analysis}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
