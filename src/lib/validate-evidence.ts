import type { Indicator } from "./contract";

export function dedupeIndicators(indicators: readonly Indicator[]): Indicator[] {
  const seen = new Set<string>();
  const unique: Indicator[] = [];

  for (const indicator of indicators) {
    const key = `${indicator.category}\u0000${indicator.evidence}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(indicator);
  }

  return unique;
}

export function evidenceOccursLiterally(
  message: string,
  evidence: string,
): boolean {
  return evidence.length > 0 && message.includes(evidence);
}
