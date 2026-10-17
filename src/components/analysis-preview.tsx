import {
  assessmentLabels,
  categoryLabels,
  confidenceLabels,
  type Analysis,
} from "@/lib/analysis";
import { highlightEvidence } from "@/lib/highlight-evidence";

type AnalysisPreviewProps = {
  message: string;
  analysis: Analysis;
};

export function AnalysisPreview({ message, analysis }: AnalysisPreviewProps) {
  const segments = highlightEvidence(message, analysis.indicators);
  const hasIndicators = analysis.indicators.length > 0;

  return (
    <article className="space-y-8">
      <div role="status">
        <p className="text-sm font-semibold tracking-wide text-accent">
          Mock analysis
        </p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
          {assessmentLabels[analysis.assessment]}
        </h3>
        <p className="mt-3 max-w-2xl text-base leading-7 text-stone-700">
          {analysis.summary}
        </p>
      </div>

      <section aria-labelledby="original-message-heading" className="space-y-3">
        <h3
          id="original-message-heading"
          className="text-lg font-semibold text-stone-950"
        >
          Original message
        </h3>
        <div className="rounded-2xl bg-stone-50 px-4 py-4 text-base leading-7 whitespace-pre-wrap text-stone-900 [overflow-wrap:anywhere]">
          {segments.map((segment) =>
            segment.kind === "text" ? (
              <span key={segment.start}>{segment.text}</span>
            ) : (
              <mark
                key={segment.start}
                className="rounded-sm bg-accent/15 px-0.5 text-stone-950 underline decoration-accent decoration-2 underline-offset-4"
              >
                <sup className="mr-0.5 font-semibold text-accent">
                  {segment.indicatorIndex + 1}
                </sup>
                {segment.text}
              </mark>
            ),
          )}
        </div>
        {hasIndicators ? (
          <p className="text-sm leading-6 text-stone-600">
            Numbered highlights are quoted again below. A phrase that appears
            more than once is marked each time it does not overlap a longer
            excerpt. If two excerpts overlap, only the longer one is marked.
          </p>
        ) : (
          <p className="text-sm leading-6 text-stone-600">
            No excerpts are highlighted for this example.
          </p>
        )}
      </section>

      <section aria-labelledby="evidence-heading" className="space-y-3">
        <h3 id="evidence-heading" className="text-lg font-semibold text-stone-950">
          Evidence
        </h3>
        {hasIndicators ? (
          <>
            <p className="text-sm leading-6 text-stone-600">
              Interpretation confidence describes how firmly this preview reads
              that excerpt. It is not a probability that the message is a scam,
              and it is not a risk score.
            </p>
            <ol className="space-y-3">
              {analysis.indicators.map((indicator, index) => (
                <li
                  key={`${indicator.category}-${index}`}
                  className="rounded-2xl border border-stone-200 px-4 py-4"
                >
                  <p className="text-sm font-medium text-stone-500">
                    Excerpt {index + 1} · {categoryLabels[indicator.category]}
                  </p>
                  <blockquote className="mt-2 border-l-2 border-accent pl-3 text-base leading-7 font-medium [overflow-wrap:anywhere] text-stone-950">
                    {indicator.evidence}
                  </blockquote>
                  <p className="mt-2 text-base leading-7 text-stone-700">
                    {indicator.explanation}
                  </p>
                  <p className="mt-3 text-sm text-stone-600">
                    Interpretation confidence: {confidenceLabels[indicator.confidence]}
                  </p>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="rounded-2xl border border-stone-200 px-4 py-4 text-base leading-7 text-stone-700">
            No selected warning signs are illustrated in this fixture. That
            does not authenticate the sender or prove safety.
          </p>
        )}
      </section>

      <section aria-labelledby="next-steps-heading" className="space-y-3">
        <h3
          id="next-steps-heading"
          className="text-lg font-semibold text-stone-950"
        >
          Safer next steps
        </h3>
        <ol className="list-decimal space-y-4 pl-5">
          {analysis.safeActions.map((action) => (
            <li key={action.title} className="pl-1">
              <p className="font-medium text-stone-950">{action.title}</p>
              <p className="mt-1 text-base leading-7 text-stone-700">
                {action.explanation}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="limitations-heading" className="space-y-3">
        <h3
          id="limitations-heading"
          className="text-lg font-semibold text-stone-950"
        >
          Limitations
        </h3>
        <p className="text-base leading-7 text-stone-700">{analysis.limitations}</p>
        <p className="rounded-2xl bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-700">
          These are predefined mock results for this preview. They are not a
          live analysis.
        </p>
      </section>
    </article>
  );
}
