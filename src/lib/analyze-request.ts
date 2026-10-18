import {
  analyzeErrorSchema,
  analyzeSuccessSchema,
  defaultMessageContext,
  MESSAGE_LIMIT,
  type AnalyzeSuccess,
  type FallbackReason,
  type MessageContext,
} from "./contract";
import { evidenceOccursLiterally } from "./validate-evidence";

export const analysisStatusCopy = {
  network:
    "The analysis could not be reached. Check your connection and try again.",
  unreadable: "The analysis response could not be read. Try again.",
  unmatched:
    "The analysis included an excerpt that is not in the submitted message, so the result was not shown.",
  unavailable: "The analysis could not be completed. Try again.",
  empty: "Enter a message before analyzing. Spaces alone do not count.",
  tooLong: "Message must be 5,000 characters or fewer.",
} as const;

const errorCodeCopy: Record<string, string> = {
  UNSUPPORTED_MEDIA_TYPE: analysisStatusCopy.unavailable,
  INVALID_JSON: analysisStatusCopy.unavailable,
  INVALID_REQUEST: analysisStatusCopy.unavailable,
  EMPTY_MESSAGE: analysisStatusCopy.empty,
  MESSAGE_TOO_LONG: analysisStatusCopy.tooLong,
};

export type AnalysisRequestOutcome =
  | { type: "aborted" }
  | { type: "error"; message: string }
  | { type: "success"; result: AnalyzeSuccess };

export type SubmissionSnapshot = {
  message: string;
  context: MessageContext;
};

export type SettledAnalysis =
  | { status: "error"; message: string }
  | {
      status: "result";
      message: string;
      context: MessageContext;
      result: AnalyzeSuccess;
    };

export function prepareSubmission(
  message: string,
):
  | { ok: true; message: string }
  | { ok: false; reason: "empty" | "tooLong" } {
  if (message.length > MESSAGE_LIMIT) return { ok: false, reason: "tooLong" };
  if (message.trim().length === 0) return { ok: false, reason: "empty" };
  return { ok: true, message };
}

export function analysisProvenanceLabel(mode: AnalyzeSuccess["mode"]): string {
  return mode === "ai" ? "AI-assisted analysis" : "Limited rules-based analysis";
}

const rulesReasonCopy: Record<FallbackReason, string> = {
  not_configured: "AI analysis is not configured.",
  timeout: "AI analysis took too long.",
  rate_limited: "AI analysis is temporarily unavailable.",
  provider_error: "AI analysis is temporarily unavailable.",
  invalid_output: "The AI response could not be validated.",
};

export function rulesProvenanceText(reason: FallbackReason | undefined): string {
  const reasonText = reason ? rulesReasonCopy[reason] : "";
  const source = "The result shown here comes from limited rules.";
  return reasonText ? `${reasonText} ${source}` : source;
}

export function interpretAnalysisBody(
  message: string,
  responseOk: boolean,
  body: unknown,
): Exclude<AnalysisRequestOutcome, { type: "aborted" }> {
  if (responseOk) {
    const parsed = analyzeSuccessSchema.safeParse(body);
    if (!parsed.success) {
      return { type: "error", message: analysisStatusCopy.unreadable };
    }

    const copied = parsed.data.analysis.indicators.every((indicator) =>
      evidenceOccursLiterally(message, indicator.evidence),
    );
    if (!copied) {
      return { type: "error", message: analysisStatusCopy.unmatched };
    }

    return { type: "success", result: parsed.data };
  }

  const parsed = analyzeErrorSchema.safeParse(body);
  if (!parsed.success) {
    return { type: "error", message: analysisStatusCopy.unreadable };
  }

  return {
    type: "error",
    message:
      errorCodeCopy[parsed.data.error.code] ?? analysisStatusCopy.unavailable,
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export async function requestAnalysis(
  message: string,
  context: MessageContext = defaultMessageContext,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<AnalysisRequestOutcome> {
  if (signal.aborted) return { type: "aborted" };

  let response: Response;
  try {
    response = await fetchImpl("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, context }),
      signal,
      cache: "no-store",
    });
  } catch (error) {
    if (isAbortError(error) || signal.aborted) return { type: "aborted" };
    return { type: "error", message: analysisStatusCopy.network };
  }

  if (signal.aborted) return { type: "aborted" };

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    if (isAbortError(error) || signal.aborted) return { type: "aborted" };
    return { type: "error", message: analysisStatusCopy.unreadable };
  }

  return interpretAnalysisBody(message, response.ok, body);
}

/**
 * Ignores an outcome when a newer request has started, or when this request
 * was aborted. The submitted snapshot is attached only for an accepted result.
 */
export function settleAnalysisRequest(
  currentRequestId: number,
  requestId: number,
  submitted: SubmissionSnapshot,
  outcome: AnalysisRequestOutcome,
): SettledAnalysis | null {
  if (currentRequestId !== requestId || outcome.type === "aborted") return null;
  if (outcome.type === "error") {
    return { status: "error", message: outcome.message };
  }
  return {
    status: "result",
    message: submitted.message,
    context: outcome.result.context,
    result: outcome.result,
  };
}
