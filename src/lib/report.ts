import {
  apparentSenderLabels,
  assessmentExplanations,
  assessmentLabels,
  categoryLabels,
  concernTypeLabels,
  evidenceStrengthLabels,
  messageExpectationLabels,
} from "./analysis";
import {
  analysisProvenanceLabel,
  rulesProvenanceText,
} from "./analyze-request";
import {
  concernIndexCaveat,
  insufficientScoreCopy,
  rubricDisclosure,
} from "./concern-rubric";
import type { AnalyzeSuccess } from "./contract";
import {
  contextConsideredIntro,
  emptyIndicatorsCopy,
  excerptSensitivityCopy,
  noConcernTypeCopy,
  noSpecificConcernActionCopy,
  noSpecificConcernEvidenceCopy,
  reportDisclaimer,
  resultQualification,
  standingLimitations,
} from "./result-copy";

export type ReportSection = {
  heading: string;
  paragraphs: string[];
};

const noNextStep = "No next step was returned with this analysis.";

export function buildReport(input: {
  message: string;
  result: AnalyzeSuccess;
  includeMessage: boolean;
}): ReportSection[] {
  const { result, includeMessage } = input;
  const analysis = result.analysis;
  const provenance = [analysisProvenanceLabel(result.mode)];
  if (result.mode === "rules") {
    provenance.push(rulesProvenanceText(result.fallbackReason));
  }

  const evidence =
    analysis.indicators.length === 0
      ? [
          analysis.assessment === "no_specific_concern"
            ? noSpecificConcernEvidenceCopy
            : emptyIndicatorsCopy,
        ]
      : analysis.indicators.flatMap((indicator, index) => [
          `Excerpt ${index + 1}. ${categoryLabels[indicator.category]}.`,
          indicator.evidence,
          indicator.explanation,
        ]);

  const actions =
    analysis.safeActions.length === 0
      ? [
          analysis.assessment === "no_specific_concern"
            ? noSpecificConcernActionCopy
            : noNextStep,
        ]
      : analysis.safeActions.flatMap((action, index) => [
          `${index + 1}. ${action.title}`,
          action.explanation,
        ]);

  const concernTypes =
    analysis.concernTypes.length === 0
      ? [noConcernTypeCopy]
      : analysis.concernTypes.map((link) => concernTypeLabels[link.type]);
  const indexParagraphs =
    analysis.concernIndex === null
      ? [
          insufficientScoreCopy,
          "This empty state is not a score of zero, and it is not a finding that the message is safe.",
          rubricDisclosure,
        ]
      : [
          String(analysis.concernIndex),
          concernIndexCaveat,
          rubricDisclosure,
        ];

  const sections: ReportSection[] = [
    {
      heading: "Concern",
      paragraphs: [
        assessmentLabels[analysis.assessment],
        assessmentExplanations[analysis.assessment],
        resultQualification,
      ],
    },
    { heading: "Concern index", paragraphs: indexParagraphs },
  ];

  if (
    analysis.assessment !== "no_specific_concern" ||
    analysis.concernTypes.length > 0
  ) {
    sections.push({ heading: "Potential concern types", paragraphs: concernTypes });
  }

  sections.push(
    {
      heading: "Evidence strength",
      paragraphs: [
        evidenceStrengthLabels[analysis.evidenceStrength],
        analysis.evidenceStrengthNote,
      ],
    },
    { heading: "How this was produced", paragraphs: provenance },
    {
      heading: "Context considered",
      paragraphs: [
        contextConsideredIntro,
        `Who this appears to be from: ${apparentSenderLabels[result.context.apparentSender]}`,
        `Expecting this message: ${messageExpectationLabels[result.context.expected]}`,
      ],
    },
    { heading: "Summary", paragraphs: [analysis.summary] },
    { heading: "Evidence", paragraphs: evidence },
    { heading: "Recommended actions", paragraphs: actions },
    {
      heading: "Limitations",
      paragraphs: [analysis.limitations, ...standingLimitations],
    },
    {
      heading: "About this report",
      paragraphs: [reportDisclaimer, excerptSensitivityCopy],
    },
  );

  if (includeMessage) {
    sections.push({ heading: "Full message", paragraphs: [input.message] });
  }

  return sections;
}

export function formatReport(sections: readonly ReportSection[]): string {
  return sections
    .map((section) => [section.heading, ...section.paragraphs].join("\n"))
    .join("\n\n");
}

export async function writeReport(
  text: string,
  writeText: (value: string) => Promise<void>,
): Promise<"copied" | "failed"> {
  try {
    await writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
