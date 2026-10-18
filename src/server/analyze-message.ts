import {
  analysisSchema,
  analyzeSuccessSchema,
  defaultMessageContext,
  type Analysis,
  type AnalyzeSuccess,
  type FallbackReason,
  type MessageContext,
} from "../lib/contract";
import {
  concernLinksAreValid,
  dedupeDraft,
  finalizeAnalysis,
  type AnalysisDraft,
} from "../lib/concern-rubric";
import { analyzeWithRules } from "../lib/rules-analyzer";
import { evidenceOccursLiterally } from "../lib/validate-evidence";
import { z } from "zod";
import {
  concernTypes,
  confidenceLevels,
  indicatorCategories,
  severities,
  textualSupports,
  unscoredReadings,
} from "../lib/analysis";

export type ProviderFailure = Exclude<FallbackReason, "not_configured">;

export type ProviderResult =
  | { ok: true; analysis: unknown }
  | { ok: false; reason: ProviderFailure };

export type AnalysisProvider = {
  analyze: (message: string, context: MessageContext) => Promise<ProviderResult>;
};

export type AnalyzeOptions = {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  diagnostics?: boolean;
  provider?: AnalysisProvider;
  context?: MessageContext;
};

function nonBlank(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

const modelDraftSchema = z.object({
  summary: z.string(),
  indicators: z.array(
    z.object({
      id: z.string(),
      category: z.enum(indicatorCategories),
      evidence: z.string(),
      explanation: z.string(),
      confidence: z.enum(confidenceLevels),
      severity: z.enum(severities),
      support: z.enum(textualSupports),
    }),
  ),
  concernTypes: z.array(
    z.object({
      type: z.enum(concernTypes),
      indicatorIds: z.array(z.string()),
    }),
  ),
  safeActions: z.array(
    z.object({
      title: z.string(),
      explanation: z.string(),
    }),
  ),
  limitations: z.string(),
  unscoredReading: z.enum(unscoredReadings),
});

export function acceptModelAnalysis(
  message: string,
  output: unknown,
): { ok: true; analysis: Analysis } | { ok: false } {
  const parsed = modelDraftSchema.safeParse(output);
  if (!parsed.success) return { ok: false };

  const draft: AnalysisDraft = {
    summary: parsed.data.summary,
    indicators: parsed.data.indicators,
    concernTypes: parsed.data.concernTypes,
    safeActions: parsed.data.safeActions,
    limitations: parsed.data.limitations,
    unscoredReading: parsed.data.unscoredReading,
  };
  if (!concernLinksAreValid(draft)) return { ok: false };
  const copied = draft.indicators.every((indicator) =>
    evidenceOccursLiterally(message, indicator.evidence),
  );
  if (!copied) return { ok: false };

  const deduped = dedupeDraft(draft);
  let analysis: Analysis;
  try {
    analysis = finalizeAnalysis(deduped);
  } catch {
    return { ok: false };
  }
  const checked = analysisSchema.safeParse(analysis);
  if (!checked.success) return { ok: false };
  return { ok: true, analysis: checked.data };
}

function rulesResult(
  message: string,
  fallbackReason: FallbackReason,
  context: MessageContext,
): AnalyzeSuccess {
  return analyzeSuccessSchema.parse({
    ok: true,
    mode: "rules",
    fallbackReason,
    context,
    analysis: analyzeWithRules(message, fallbackReason, context),
  });
}

/**
 * Uses an injected provider, or builds the OpenAI provider only when both
 * configuration values are present. This function does not read the environment.
 * AI and rules indicators are never combined.
 */
export async function analyzeMessage(
  message: string,
  options: AnalyzeOptions = {},
): Promise<AnalyzeSuccess> {
  const context = options.context ?? defaultMessageContext;
  const provider = options.provider ?? (await configuredProvider(options));
  if (!provider) return rulesResult(message, "not_configured", context);

  let providerResult: ProviderResult;
  try {
    providerResult = await provider.analyze(message, context);
  } catch {
    return rulesResult(message, "provider_error", context);
  }

  if (!providerResult.ok) {
    return rulesResult(message, providerResult.reason, context);
  }

  const accepted = acceptModelAnalysis(message, providerResult.analysis);
  if (!accepted.ok) return rulesResult(message, "invalid_output", context);

  return analyzeSuccessSchema.parse({
    ok: true,
    mode: "ai",
    context,
    analysis: accepted.analysis,
  });
}

async function configuredProvider(
  options: AnalyzeOptions,
): Promise<AnalysisProvider | undefined> {
  if (!nonBlank(options.apiKey) || !nonBlank(options.model)) return undefined;
  const { createOpenAIAnalyzer } = await import("./openai-analyzer");
  return createOpenAIAnalyzer({
    apiKey: options.apiKey.trim(),
    model: options.model.trim(),
    timeoutMs: options.timeoutMs,
    diagnostics: options.diagnostics,
  });
}
