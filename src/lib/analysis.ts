export const assessments = ["high_concern", "some_concern", "unclear"] as const;

export type Assessment = (typeof assessments)[number];

export const assessmentLabels: Record<Assessment, string> = {
  high_concern: "High concern",
  some_concern: "Some concern",
  unclear: "Unclear",
};

export const indicatorCategories = [
  "urgency",
  "impersonation",
  "sensitive_information",
  "payment",
  "suspicious_link",
  "other",
] as const;

export type IndicatorCategory = (typeof indicatorCategories)[number];

export const categoryLabels: Record<IndicatorCategory, string> = {
  urgency: "Urgency",
  impersonation: "Impersonation",
  sensitive_information: "Sensitive information",
  payment: "Payment",
  suspicious_link: "Suspicious link",
  other: "Other",
};

export const confidenceLevels = ["high", "medium", "low"] as const;

export type Confidence = (typeof confidenceLevels)[number];

export const confidenceLabels: Record<Confidence, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export type { Analysis, Indicator, SafeAction } from "./contract";
