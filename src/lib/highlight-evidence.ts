export type MessageSegment =
  | { kind: "text"; text: string; start: number }
  | {
      kind: "evidence";
      text: string;
      start: number;
      indicatorIndex: number;
    };

/**
 * Highlights literal evidence excerpts in a message.
 *
 * The scan walks left to right. At each position it keeps the longest
 * evidence string that matches there. Equal lengths keep the earlier
 * indicator. The scan then jumps past that match, so a shorter overlapping
 * excerpt is not highlighted separately. The same excerpt is highlighted
 * again if it occurs later without overlapping a longer match.
 * Empty evidence is ignored. Evidence that never occurs is ignored, and
 * nothing is invented in its place.
 */
export function highlightEvidence(
  message: string,
  indicators: readonly { evidence: string }[],
): MessageSegment[] {
  const candidates = indicators.flatMap((indicator, indicatorIndex) =>
    indicator.evidence.length > 0
      ? [{ evidence: indicator.evidence, indicatorIndex }]
      : [],
  );

  const segments: MessageSegment[] = [];
  let index = 0;
  let plainStart = 0;

  const pushPlain = (end: number) => {
    if (end > plainStart) {
      segments.push({
        kind: "text",
        text: message.slice(plainStart, end),
        start: plainStart,
      });
    }
  };

  while (index < message.length) {
    let best: { evidence: string; indicatorIndex: number } | null = null;

    for (const candidate of candidates) {
      if (!message.startsWith(candidate.evidence, index)) continue;
      if (best === null || candidate.evidence.length > best.evidence.length) {
        best = candidate;
      }
    }

    if (best) {
      pushPlain(index);
      segments.push({
        kind: "evidence",
        text: best.evidence,
        start: index,
        indicatorIndex: best.indicatorIndex,
      });
      index += best.evidence.length;
      plainStart = index;
    } else {
      index += 1;
    }
  }

  pushPlain(message.length);
  return segments;
}
