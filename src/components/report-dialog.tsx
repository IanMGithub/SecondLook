"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { AnalyzeSuccess } from "@/lib/contract";
import { buildReport, formatReport, writeReport } from "@/lib/report";
import { excerptSensitivityCopy } from "@/lib/result-copy";

type ReportDialogProps = {
  message: string;
  result: AnalyzeSuccess;
};

export function ReportDocument({
  sections,
}: {
  sections: ReturnType<typeof buildReport>;
}) {
  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <section key={section.heading} className="space-y-2">
          <h3 className="text-sm font-semibold tracking-wide text-stone-500">
            {section.heading}
          </h3>
          {section.paragraphs.map((paragraph, index) => (
            <p
              key={`${section.heading}-${index}`}
              className="text-base leading-7 whitespace-pre-wrap text-stone-800 [overflow-wrap:anywhere]"
            >
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}

export function ReportDialog({ message, result }: ReportDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  const [open, setOpen] = useState(false);
  const [includeMessage, setIncludeMessage] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const sections = buildReport({ message, result, includeMessage });
  const reportText = formatReport(sections);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
      headingRef.current?.focus({ preventScroll: true });
      return;
    }
    if (dialog.open) dialog.close();
  }, [open]);

  async function copy() {
    const outcome = await writeReport(reportText, (value) =>
      navigator.clipboard.writeText(value),
    );
    setCopyState(outcome);
  }

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => {
          setIncludeMessage(false);
          setCopyState("idle");
          setOpen(true);
        }}
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
      >
        Create report
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={headingId}
        onClose={() => {
          setOpen(false);
          triggerRef.current?.focus({ preventScroll: true });
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(100%-1.5rem,40rem)] overflow-y-auto rounded-3xl border border-stone-200 bg-white p-5 text-stone-950 backdrop:bg-stone-950/40 sm:p-7"
      >
        <div className="space-y-6">
          <h2
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-semibold tracking-tight focus:outline-2 focus:outline-offset-[3px] focus:outline-accent"
          >
            Report
          </h2>
          <ReportDocument sections={sections} />
          <div className="space-y-2 border-t border-stone-200 pt-4">
            <label className="flex items-start gap-3 text-base leading-7 text-stone-900">
              <input
                type="checkbox"
                className="mt-1.5"
                checked={includeMessage}
                onChange={(event) => {
                  setIncludeMessage(event.target.checked);
                  setCopyState("idle");
                }}
              />
              Include the full message
            </label>
            <p className="text-sm leading-6 text-stone-600">{excerptSensitivityCopy}</p>
          </div>
          <p role="status" className="text-sm font-medium text-stone-800">
            {copyState === "copied" ? "Report copied." : null}
            {copyState === "failed" ? "The report could not be copied." : null}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                void copy();
              }}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
            >
              Copy report
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800"
            >
              Close
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
