import {
  apparentSenderLabels,
  assessmentExplanations,
  assessmentLabels,
  categoryLabels,
  concernTypeLabels,
  confidenceLabels,
  evidenceStrengthLabels,
  messageExpectationLabels,
} from "@/lib/analysis";
import {
  analysisProvenanceLabel,
  rulesProvenanceText,
} from "@/lib/analyze-request";
import {
  concernIndexCaveat,
  insufficientScoreCopy,
  rubricDisclosure,
} from "@/lib/concern-rubric";
import type { AnalyzeSuccess } from "@/lib/contract";
import { highlightEvidence } from "@/lib/highlight-evidence";
import {
  contextConsideredIntro,
  emptyIndicatorsCopy,
  noConcernTypeCopy,
  noSpecificConcernActionCopy,
  noSpecificConcernEvidenceCopy,
  resultQualification,
  standingLimitations,
} from "@/lib/result-copy";

type AnalysisResultProps = {
  message: string;
  result: AnalyzeSuccess;
};

export function AnalysisResult({ message, result }: AnalysisResultProps) {
  const analysis = result.analysis;
  const segments = highlightEvidence(message, analysis.indicators);
  const hasIndicators = analysis.indicators.length > 0;
  const benign = analysis.assessment === "no_specific_concern";
  const scored = analysis.concernIndex !== null;
  const emptyEvidenceCopy = benign ? noSpecificConcernEvidenceCopy : emptyIndicatorsCopy;
  const emptyActionCopy = benign
    ? noSpecificConcernActionCopy
    : "No next step was returned with this analysis.";

  return (
    <article className="space-y-8">
      <div>
        <p className="text-sm font-semibold tracking-wide text-accent">
          {analysisProvenanceLabel(result.mode)}
        </p>
        {result.mode === "rules" ? (
          <p className="mt-2 text-sm leading-6 text-stone-700">
            {rulesProvenanceText(result.fallbackReason)}
          </p>
        ) : null}
        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
          {assessmentLabels[analysis.assessment]}
        </h3>
        <p className="mt-2 max-w-2xl text-base leading-7 text-stone-700">
          {assessmentExplanations[analysis.assessment]}
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          {resultQualification}
        </p>

        {scored ? (
          <div className="mt-4 max-w-2xl space-y-3">
            <p className="text-sm font-medium text-stone-700">
              Concern index{" "}
              <span className="ml-2 text-xl font-semibold text-stone-950">
                {analysis.concernIndex}
              </span>
            </p>
            <p className="text-sm leading-6 text-stone-700">{concernIndexCaveat}</p>
            <div>
              <h4 className="text-sm font-medium text-stone-950">
                Potential concern types
              </h4>
              {analysis.concernTypes.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {analysis.concernTypes.map((link) => (
                    <li
                      key={link.type}
                      className="rounded-full border border-stone-300 px-3 py-1 text-sm text-stone-800"
                    >
                      {concernTypeLabels[link.type]}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm leading-6 text-stone-700">
                  {noConcernTypeCopy}
                </p>
              )}
            </div>
            <p className="text-sm leading-6 text-stone-800">
              <span className="font-medium">Evidence strength: </span>
              {evidenceStrengthLabels[analysis.evidenceStrength]}
            </p>
            <p className="text-sm leading-6 text-stone-700">
              {analysis.evidenceStrengthNote}
            </p>
            <details className="text-sm leading-6 text-stone-700">
              <summary className="cursor-pointer font-medium text-stone-950">
                How this is calculated
              </summary>
              <p className="mt-2">{rubricDisclosure}</p>
            </details>
          </div>
        ) : (
          <details className="mt-4 max-w-2xl text-sm leading-6 text-stone-700">
            <summary className="cursor-pointer font-medium text-stone-950">
              Assessment details
            </summary>
            <div className="mt-3 space-y-3">
              <p>
                Concern index: {insufficientScoreCopy} This empty state is not a
                score of zero, and it is not a finding that the message is safe.
              </p>
              {!benign ? (
                <p>
                  Potential concern types:{" "}
                  {analysis.concernTypes.length > 0
                    ? analysis.concernTypes
                        .map((link) => concernTypeLabels[link.type])
                        .join(", ")
                    : noConcernTypeCopy}
                </p>
              ) : null}
              <p>
                Evidence strength:{" "}
                {evidenceStrengthLabels[analysis.evidenceStrength]}
              </p>
              <p>{analysis.evidenceStrengthNote}</p>
              <p>{rubricDisclosure}</p>
            </div>
          </details>
        )}

        <p className="mt-4 max-w-2xl text-base leading-7 text-stone-700">
          {analysis.summary}
        </p>
      </div>

      <section aria-labelledby="context-considered-heading" className="space-y-2">
        <h3
          id="context-considered-heading"
          className="text-lg font-semibold text-stone-950"
        >
          Context considered
        </h3>
        <p className="text-sm leading-6 text-stone-700">{contextConsideredIntro}</p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-stone-950">
              Who this appears to be from
            </dt>
            <dd className="text-base leading-7 text-stone-700">
              {apparentSenderLabels[result.context.apparentSender]}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-stone-950">
              Expecting this message
            </dt>
            <dd className="text-base leading-7 text-stone-700">
              {messageExpectationLabels[result.context.expected]}
            </dd>
          </div>
        </dl>
      </section>

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
            No excerpts are highlighted.
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
              Interpretation confidence describes how firmly this analysis reads
              that excerpt. It is separate from evidence strength, and it is not
              a multiplier in the concern index.
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
            {emptyEvidenceCopy}
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
        {analysis.safeActions.length > 0 ? (
          <ol className="list-decimal space-y-4 pl-5">
            {analysis.safeActions.map((action, index) => (
              <li key={`${action.title}-${index}`} className="pl-1">
                <p className="font-medium text-stone-950">{action.title}</p>
                <p className="mt-1 text-base leading-7 text-stone-700">
                  {action.explanation}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-base leading-7 text-stone-700">{emptyActionCopy}</p>
        )}
      </section>

      <section aria-labelledby="limitations-heading" className="space-y-3">
        <h3
          id="limitations-heading"
          className="text-lg font-semibold text-stone-950"
        >
          Limitations
        </h3>
        <details className="text-sm leading-6 text-stone-700">
          <summary className="cursor-pointer font-medium text-stone-950">
            Full limitations
          </summary>
          <p className="mt-3 text-base leading-7 text-stone-700">
            {analysis.limitations}
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-stone-700">
            {standingLimitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </details>
      </section>
    </article>
  );
}
