import type { Assessment } from "./analysis";
import { analysisStatusCopy, interpretAnalysisBody } from "./analyze-request";
import type { MessageContext } from "./contract";

export const DEFAULT_EVALUATION_LIMIT = 3;
export const DEFAULT_COMPARISON_LIMIT = 2;

export const LIVE_EVALUATION_WARNING =
  "This command can send fictional messages to the local analysis server. If that server is configured with an API key and a model, each case can call OpenAI and spend money. It is not an accuracy benchmark. A rules result is a fallback, not an AI quality sample.";

export type EvaluationPlan =
  | { run: false; reason: "confirmation-required" | "invalid-limit" }
  | { run: true; limit: number; comparison: boolean };

export type LiveCaseRecord = {
  id: string;
  classification: "ai" | "rules-fallback" | "ai-with-fallback-reason" | "rejected" | "request-failed";
  httpStatus: number;
  mode?: "ai" | "rules";
  fallbackReason?:
    | "not_configured"
    | "timeout"
    | "rate_limited"
    | "provider_error"
    | "invalid_output";
  assessment?: Assessment;
  context?: "absent" | "present";
  indicatorCount?: number;
  evidenceLiteral?: boolean;
  rejection?: keyof typeof analysisStatusCopy;
};

const rejectionByCopy = Object.fromEntries(
  Object.entries(analysisStatusCopy).map(([key, copy]) => [copy, key]),
) as Record<string, keyof typeof analysisStatusCopy>;

export function parseEvaluationArgs(
  argv: readonly string[],
  caseCount: number,
): EvaluationPlan {
  const comparison = argv.includes("--context-pairs");
  if (!argv.includes("--confirm")) {
    return { run: false, reason: "confirmation-required" };
  }

  const limitIndex = argv.indexOf("--limit");
  const fallback = comparison ? DEFAULT_COMPARISON_LIMIT : DEFAULT_EVALUATION_LIMIT;
  const raw = limitIndex === -1 ? String(fallback) : argv[limitIndex + 1];
  if (raw === undefined || !/^\d+$/.test(raw)) {
    return { run: false, reason: "invalid-limit" };
  }

  const limit = Number(raw);
  if (limit < 1) return { run: false, reason: "invalid-limit" };
  return { run: true, limit: Math.min(limit, caseCount), comparison };
}

export function evaluationReportPath(now: Date, comparison = false): string {
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const prefix = comparison ? "context" : "live";
  return `evaluation-reports/${prefix}-${stamp}.json`;
}

export function comparisonRequestBody(
  message: string,
  context: MessageContext | undefined,
): { message: string; context?: MessageContext } {
  return context === undefined ? { message } : { message, context };
}

export function summarizeLiveResponse(
  id: string,
  message: string,
  httpStatus: number,
  body: unknown,
): LiveCaseRecord {
  const outcome = interpretAnalysisBody(message, httpStatus >= 200 && httpStatus < 300, body);
  if (outcome.type !== "success") {
    return {
      id,
      classification: "rejected",
      httpStatus,
      rejection: rejectionByCopy[outcome.message] ?? "unreadable",
    };
  }

  const { result } = outcome;
  const classification =
    result.mode === "rules"
      ? "rules-fallback"
      : result.fallbackReason
        ? "ai-with-fallback-reason"
        : "ai";

  return {
    id,
    classification,
    httpStatus,
    mode: result.mode,
    ...(result.fallbackReason ? { fallbackReason: result.fallbackReason } : {}),
    assessment: result.analysis.assessment,
    indicatorCount: result.analysis.indicators.length,
    evidenceLiteral: true,
  };
}

export function requestFailedRecord(id: string): LiveCaseRecord {
  return { id, classification: "request-failed", httpStatus: 0 };
}
