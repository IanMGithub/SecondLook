import { z } from "zod";
import {
  assessments,
  confidenceLevels,
  indicatorCategories,
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

export const indicatorSchema = z.strictObject({
  category: indicatorCategorySchema,
  evidence: nonblankText,
  explanation: nonblankText,
  confidence: confidenceSchema,
});

export const safeActionSchema = z.strictObject({
  title: nonblankText,
  explanation: nonblankText,
});

export const analysisSchema = z.strictObject({
  assessment: assessmentSchema,
  summary: nonblankText,
  indicators: z.array(indicatorSchema),
  safeActions: z.array(safeActionSchema),
  limitations: nonblankText,
});

export const analysisModeSchema = z.enum(["ai", "rules"]);

export const analyzeSuccessSchema = z.strictObject({
  ok: z.literal(true),
  mode: analysisModeSchema,
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

export const analyzeRequestSchema = z.strictObject({
  message: z.string(),
});

export type Analysis = z.infer<typeof analysisSchema>;
export type Indicator = z.infer<typeof indicatorSchema>;
export type SafeAction = z.infer<typeof safeActionSchema>;
export type AnalysisMode = z.infer<typeof analysisModeSchema>;
export type AnalyzeSuccess = z.infer<typeof analyzeSuccessSchema>;
export type AnalyzeError = z.infer<typeof analyzeErrorSchema>;
export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>;
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

export type ParsedAnalyzeRequest =
  | { ok: true; message: string }
  | {
      ok: false;
      status: 400 | 413;
      code: "INVALID_REQUEST" | "EMPTY_MESSAGE" | "MESSAGE_TOO_LONG";
      error: string;
    };

/**
 * Accepts only `{ message: string }`.
 * Length uses JavaScript string length. Trimming is used only to decide
 * whether the message is blank, and the original string is returned unchanged.
 * An over-long message is reported before the blank check.
 */
export function parseAnalyzeRequest(body: unknown): ParsedAnalyzeRequest {
  const parsed = analyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_REQUEST",
      error: "Request must be an object with only a message string.",
    };
  }

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

  return { ok: true, message: parsed.data.message };
}
