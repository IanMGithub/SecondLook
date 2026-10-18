import type {
  ConcernType,
  EvidenceStrength,
  Severity,
  TextualSupport,
  UnscoredReading,
} from "./analysis";
import {
  CONCERN_INDEX_VERSION,
  CONCERN_LABEL_THRESHOLD,
  analysisSchema,
  type Analysis,
  type Indicator,
} from "./contract";

/**
 * concern-index-v2
 *
 * Product-design weights, not a validated estimate of fraud, harm, or model
 * accuracy. Scores are not comparable across domains as measurements of
 * real-world danger. Weights are unchanged from v1. v2 adds a label for an
 * unscored reading that found no specific warning sign. That label is not a
 * lower score and it is not verified safety.
 *
 * Inputs: indicators cited by at least one concern type. Each contributes its
 * severity weight once per distinct evidence string. Indicator confidence is
 * not an input. Concern-type labels add no points by themselves. User-reported
 * context is not an input.
 *
 * Weights: low 15, moderate 30, high 45.
 * The highest distinct excerpt counts in full. The second counts half,
 * rounded down. Every further excerpt counts zero.
 * The total is capped at 100. These weights cannot reach 0.
 *
 * Label: 40 or more -> high concern. A lower scored result -> some concern.
 * The label is not chosen separately from the index.
 * Null index with an explicit no-specific-concern reading and no indicators
 * -> no specific concern. Any other null index -> unclear.
 * Null is not zero and not safe. No specific concern is not safe either.
 *
 * Evidence strength uses the textual-support field of the scored excerpts:
 * direct only when every scored excerpt is marked direct; context-dependent
 * when any scored excerpt is contextual; insufficient when the index is null.
 * An exact string match does not set that field.
 */
export const SEVERITY_POINTS: Record<Severity, number> = {
  low: 15,
  moderate: 30,
  high: 45,
};

export const concernIndexCaveat =
  "Heuristic warning-sign index, not a probability of fraud or harm.";

export const insufficientScoreCopy = "Insufficient evidence to score.";

export const evidenceStrengthNotes: Record<EvidenceStrength, string> = {
  insufficient:
    "There is not enough linked warning text to describe textual support. This is not a finding that the message is safe.",
  direct:
    "Each linked excerpt states a request, threat, or demand in its own words. This describes the text only. It does not show who sent the message, whether a threat is real, or how accurate the reading is.",
  context_dependent:
    "At least one linked excerpt needs surrounding wording before it supports the reading. An exact phrase is not a measure of certainty, danger, or model accuracy.",
};

export const rubricDisclosure = [
  "Rubric concern-index-v2. These weights are product-design choices, not scientifically validated risk estimates. Tactic labels such as urgency are not concern types. The weights are the same as v1.",
  "Only excerpts linked to a potential concern type are counted. The type name itself adds nothing. User-reported context does not add or remove points.",
  "Low counts 15, moderate counts 30, and high counts 45. The same excerpt is counted once, even if it supports more than one type.",
  "The strongest excerpt counts in full. A second distinct excerpt counts half, rounded down. Further excerpts do not raise the index.",
  "40 or more is labeled high concern. Below that, a scored result is labeled some concern.",
  "No linked excerpt means the index is not scored. That empty state is not zero. No specific concern means this analysis did not identify a warning sign. Unclear means it cannot tell. Neither means the message is safe or the sender is verified.",
  "Evidence strength says whether the linked wording states the concern on its own or needs surrounding message text. It is not a probability, and indicator confidence is not a score multiplier.",
  "The index is not a comparison of real-world harm across different kinds of messages. AI choices about severity and textual support still affect this deterministic total.",
].join(" ");

export type AnalysisDraft = {
  summary: string;
  indicators: Indicator[];
  concernTypes: { type: ConcernType; indicatorIds: string[] }[];
  safeActions: Analysis["safeActions"];
  limitations: string;
  unscoredReading?: UnscoredReading;
};

const severityRank: Record<Severity, number> = { low: 1, moderate: 2, high: 3 };

export function concernLinksAreValid(draft: AnalysisDraft): boolean {
  const ids = draft.indicators.map((indicator) => indicator.id);
  if (new Set(ids).size !== ids.length) return false;
  if (!ids.every((id) => /^i[1-9]\d{0,2}$/.test(id))) return false;
  const idSet = new Set(ids);
  const seen = new Set<string>();
  for (const link of draft.concernTypes) {
    if (seen.has(link.type) || link.indicatorIds.length === 0) return false;
    seen.add(link.type);
    if (link.indicatorIds.some((id) => !idSet.has(id))) return false;
  }
  return true;
}

export function dedupeDraft(draft: AnalysisDraft): AnalysisDraft {
  const seen = new Map<string, string>();
  const idMap = new Map<string, string>();
  const indicators: Indicator[] = [];

  for (const indicator of draft.indicators) {
    const key = `${indicator.category}\u0000${indicator.evidence}`;
    const kept = seen.get(key);
    if (kept) {
      idMap.set(indicator.id, kept);
      continue;
    }
    seen.set(key, indicator.id);
    idMap.set(indicator.id, indicator.id);
    indicators.push(indicator);
  }

  const merged = new Map<ConcernType, string[]>();
  for (const link of draft.concernTypes) {
    const ids = [
      ...new Set(
        link.indicatorIds
          .map((id) => idMap.get(id))
          .filter((id): id is string => id !== undefined),
      ),
    ];
    if (ids.length === 0) continue;
    const current = merged.get(link.type) ?? [];
    merged.set(link.type, [...new Set([...current, ...ids])]);
  }

  return {
    ...draft,
    indicators,
    concernTypes: [...merged.entries()].map(([type, indicatorIds]) => ({
      type,
      indicatorIds,
    })),
  };
}

export function finalizeAnalysis(draft: AnalysisDraft): Analysis {
  const linkedIds = new Set(draft.concernTypes.flatMap((link) => link.indicatorIds));
  const scored = new Map<string, { severity: Severity; support: TextualSupport }>();

  for (const indicator of draft.indicators) {
    if (!linkedIds.has(indicator.id)) continue;
    const current = scored.get(indicator.evidence);
    if (!current || severityRank[indicator.severity] > severityRank[current.severity]) {
      scored.set(indicator.evidence, {
        severity: indicator.severity,
        support: indicator.support,
      });
      continue;
    }
    if (indicator.severity === current.severity && indicator.support === "direct") {
      current.support = "direct";
    }
  }

  let concernIndex: number | null = null;
  let assessment: Analysis["assessment"] = "unclear";
  let evidenceStrength: EvidenceStrength = "insufficient";

  if (scored.size > 0) {
    const points = [...scored.values()]
      .map((item) => SEVERITY_POINTS[item.severity])
      .sort((left, right) => right - left);
    const total = points.reduce((sum, value, index) => {
      if (index === 0) return sum + value;
      if (index === 1) return sum + Math.floor(value / 2);
      return sum;
    }, 0);
    concernIndex = Math.min(100, total);
    assessment = concernIndex >= CONCERN_LABEL_THRESHOLD ? "high_concern" : "some_concern";
    evidenceStrength = [...scored.values()].every((item) => item.support === "direct")
      ? "direct"
      : "context_dependent";
  } else if (
    draft.unscoredReading === "no_specific_concern" &&
    draft.indicators.length === 0 &&
    draft.concernTypes.length === 0
  ) {
    assessment = "no_specific_concern";
  }

  return analysisSchema.parse({
    assessment,
    summary: draft.summary,
    indicators: draft.indicators,
    concernTypes: concernIndex === null ? [] : draft.concernTypes,
    concernIndex,
    concernIndexVersion: CONCERN_INDEX_VERSION,
    evidenceStrength,
    evidenceStrengthNote: evidenceStrengthNotes[evidenceStrength],
    safeActions: draft.safeActions,
    limitations: draft.limitations,
  });
}
