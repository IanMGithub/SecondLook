import { z } from "zod";
import {
  apparentSenders,
  assessments,
  concernTypes,
  confidenceLevels,
  evidenceStrengths,
  indicatorCategories,
  messageExpectations,
  severities,
  textualSupports,
  unscoredReadings,
  type ApparentSender,
  type MessageExpectation,
} from "./analysis";

/**
 * Shared request and analysis contract.
 *
 * This module must stay free of server secrets and server-only imports.
 * It checks shape only. A nonblank evidence string is not proof that the
 * excerpt appears in the message.
 */

export const MESSAGE_LIMIT = 5000;

const nonblankText = z.string().refine((value) => value.trim().length > 0, {
  error: "Text is required.",
});

export const assessmentSchema = z.enum(assessments);
export const indicatorCategorySchema = z.enum(indicatorCategories);
export const confidenceSchema = z.enum(confidenceLevels);
export const concernTypeSchema = z.enum(concernTypes);
export const severitySchema = z.enum(severities);
export const textualSupportSchema = z.enum(textualSupports);
export const evidenceStrengthSchema = z.enum(evidenceStrengths);
export const CONCERN_INDEX_VERSION = "concern-index-v2" as const;
export const CONCERN_LABEL_THRESHOLD = 40;

const indicatorIdSchema = z.string().regex(/^i[1-9]\d{0,2}$/);

export const indicatorSchema = z.strictObject({
  id: indicatorIdSchema,
  category: indicatorCategorySchema,
  evidence: nonblankText,
  explanation: nonblankText,
  confidence: confidenceSchema,
  severity: severitySchema,
  support: textualSupportSchema,
});

export const safeActionSchema = z.strictObject({
  title: nonblankText,
  explanation: nonblankText,
});

export const concernLinkSchema = z.strictObject({
  type: concernTypeSchema,
  indicatorIds: z.array(indicatorIdSchema).min(1),
});

export const analysisSchema = z
  .strictObject({
    assessment: assessmentSchema,
    summary: nonblankText,
    indicators: z.array(indicatorSchema),
    concernTypes: z.array(concernLinkSchema),
    concernIndex: z.number().int().min(1).max(100).nullable(),
    concernIndexVersion: z.literal(CONCERN_INDEX_VERSION),
    evidenceStrength: evidenceStrengthSchema,
    evidenceStrengthNote: nonblankText,
    safeActions: z.array(safeActionSchema),
    limitations: nonblankText,
  })
  .superRefine((analysis, ctx) => {
    const ids = analysis.indicators.map((indicator) => indicator.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: "custom", message: "Indicator ids must be unique." });
    }
    const idSet = new Set(ids);
    const types = new Set<string>();
    for (const link of analysis.concernTypes) {
      if (types.has(link.type)) {
        ctx.addIssue({ code: "custom", message: "Concern types must be unique." });
      }
      types.add(link.type);
      if (link.indicatorIds.some((id) => !idSet.has(id))) {
        ctx.addIssue({
          code: "custom",
          message: "Concern types must cite indicator ids from this analysis.",
        });
      }
    }

    const linked = analysis.concernTypes.length > 0;
    if (analysis.concernIndex === null) {
      if (linked || analysis.evidenceStrength !== "insufficient") {
        ctx.addIssue({
          code: "custom",
          message: "An unscored analysis does not list concern types.",
        });
      }
      if (analysis.assessment === "no_specific_concern") {
        if (analysis.indicators.length > 0) {
          ctx.addIssue({
            code: "custom",
            message: "No specific concern requires an empty indicator list.",
          });
        }
      } else if (analysis.assessment !== "unclear") {
        ctx.addIssue({
          code: "custom",
          message: "An unscored analysis is unclear or no specific concern.",
        });
      }
      return;
    }
    if (analysis.assessment === "no_specific_concern") {
      ctx.addIssue({
        code: "custom",
        message: "A scored analysis cannot be labeled no specific concern.",
      });
    }

    const expected =
      analysis.concernIndex >= CONCERN_LABEL_THRESHOLD ? "high_concern" : "some_concern";
    if (analysis.assessment !== expected || analysis.evidenceStrength === "insufficient") {
      ctx.addIssue({
        code: "custom",
        message: "The concern label and evidence strength must follow the index.",
      });
    }
  });

export const analysisModeSchema = z.enum(["ai", "rules"]);

/**
 * Optional success-only field. Rules results from this app include one of
 * these reasons. AI results omit it. Values are categories, not provider text.
 */
export const fallbackReasons = [
  "not_configured",
  "timeout",
  "rate_limited",
  "provider_error",
  "invalid_output",
] as const;

export const fallbackReasonSchema = z.enum(fallbackReasons);

export const messageContextSchema = z.strictObject({
  apparentSender: z.enum(apparentSenders),
  expected: z.enum(messageExpectations),
});

const analyzeRequestContextSchema = z.strictObject({
  apparentSender: z.enum(apparentSenders).optional(),
  expected: z.enum(messageExpectations).optional(),
});

export const analyzeRequestSchema = z.strictObject({
  message: z.string(),
  context: analyzeRequestContextSchema.optional(),
});

export const defaultMessageContext: MessageContext = {
  apparentSender: "not_sure",
  expected: "not_sure",
};

export const unscoredReadingSchema = z.enum(unscoredReadings);

export const analyzeSuccessSchema = z.strictObject({
  ok: z.literal(true),
  mode: analysisModeSchema,
  fallbackReason: fallbackReasonSchema.optional(),
  context: messageContextSchema,
  analysis: analysisSchema,
});

export const analyzeErrorSchema = z.strictObject({
  ok: z.literal(false),
  error: z.strictObject({
    code: nonblankText,
    message: nonblankText,
  }),
});

export const analyzeResponseSchema = z.discriminatedUnion("ok", [
  analyzeSuccessSchema,
  analyzeErrorSchema,
]);

export type Analysis = z.infer<typeof analysisSchema>;
export type Indicator = z.infer<typeof indicatorSchema>;
export type SafeAction = z.infer<typeof safeActionSchema>;
export type AnalysisMode = z.infer<typeof analysisModeSchema>;
export type FallbackReason = z.infer<typeof fallbackReasonSchema>;
export type AnalyzeSuccess = z.infer<typeof analyzeSuccessSchema>;
export type AnalyzeError = z.infer<typeof analyzeErrorSchema>;
export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>;
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
export type MessageContext = {
  apparentSender: ApparentSender;
  expected: MessageExpectation;
};
export type UnscoredReading = z.infer<typeof unscoredReadingSchema>;

export type ParsedAnalyzeRequest =
  | { ok: true; message: string; context: MessageContext }
  | {
      ok: false;
      status: 400 | 413;
      code: "INVALID_REQUEST" | "EMPTY_MESSAGE" | "MESSAGE_TOO_LONG";
      error: string;
    };

const invalidRequest = {
  ok: false as const,
  status: 400 as const,
  code: "INVALID_REQUEST" as const,
  error:
    "Request must be an object with a message string. Context, if included, must use the allowed choices.",
};

/**
 * Accepts `{ message: string }` and an optional context object.
 * Omitted context, or an omitted choice inside context, uses explicit defaults:
 * apparent sender "not sure" and expectation "not sure".
 * Length uses JavaScript string length. Trimming is used only to decide
 * whether the message is blank, and the original string is returned unchanged.
 * An over-long message is reported before the blank check.
 */
export function parseAnalyzeRequest(body: unknown): ParsedAnalyzeRequest {
  const parsed = analyzeRequestSchema.safeParse(body);
  if (!parsed.success) return invalidRequest;

  const context = resolveContext(parsed.data.context);
  if (!context) return invalidRequest;

  if (parsed.data.message.length > MESSAGE_LIMIT) {
    return {
      ok: false,
      status: 413,
      code: "MESSAGE_TOO_LONG",
      error: "Message must be 5,000 characters or fewer.",
    };
  }

  if (parsed.data.message.trim().length === 0) {
    return {
      ok: false,
      status: 400,
      code: "EMPTY_MESSAGE",
      error: "Message must include non-whitespace text.",
    };
  }

  return { ok: true, message: parsed.data.message, context };
}

function resolveContext(
  context: z.infer<typeof analyzeRequestContextSchema> | undefined,
): MessageContext | null {
  if (context === undefined) return { ...defaultMessageContext };
  const apparentSender = context.apparentSender ?? defaultMessageContext.apparentSender;
  const expected = context.expected ?? defaultMessageContext.expected;
  const resolved = messageContextSchema.safeParse({ apparentSender, expected });
  return resolved.success ? resolved.data : null;
}
