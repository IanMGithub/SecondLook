export const assessments = [
  "high_concern",
  "some_concern",
  "no_specific_concern",
  "unclear",
] as const;

export type Assessment = (typeof assessments)[number];

/** Friendly headlines for results and reports. Underlying enum values stay unchanged. */
export const assessmentLabels: Record<Assessment, string> = {
  high_concern: "High concern",
  some_concern: "Double-check",
  no_specific_concern: "Looks routine",
  unclear: "More context needed",
};

/** Short plain-language support under the headline. Shared by results and reports. */
export const assessmentExplanations: Record<Assessment, string> = {
  high_concern:
    "This message includes stronger warning signs. Pause and verify through a channel you already trust.",
  some_concern:
    "This message includes warning signs worth checking another way before you act.",
  no_specific_concern:
    "No specific warning signs were identified in this message. That does not verify the sender or guarantee the message is safe.",
  unclear:
    "There is not enough clear warning-sign evidence to label this message more specifically.",
};

/**
 * What the user says the message appears to be. This is a label the user
 * picked. It is not a verified identity.
 */
export const apparentSenders = [
  "not_sure",
  "friend_or_family",
  "work_or_school",
  "business_or_organization",
  "unknown_sender",
] as const;

export type ApparentSender = (typeof apparentSenders)[number];

export const apparentSenderLabels: Record<ApparentSender, string> = {
  not_sure: "Not sure",
  friend_or_family: "Friend or family",
  work_or_school: "Work or school contact",
  business_or_organization: "Business or organization",
  unknown_sender: "Unknown sender",
};

export const messageExpectations = ["not_sure", "yes", "no"] as const;

export type MessageExpectation = (typeof messageExpectations)[number];

export const messageExpectationLabels: Record<MessageExpectation, string> = {
  not_sure: "Not sure",
  yes: "Yes",
  no: "No",
};

/** Used only when the concern index is null. A scored result ignores it. */
export const unscoredReadings = ["no_specific_concern", "unclear"] as const;

export type UnscoredReading = (typeof unscoredReadings)[number];

export function isApparentSender(value: string): value is ApparentSender {
  return (apparentSenders as readonly string[]).includes(value);
}

export function isMessageExpectation(value: string): value is MessageExpectation {
  return (messageExpectations as readonly string[]).includes(value);
}

export const indicatorCategories = [
  "urgency",
  "impersonation",
  "sensitive_information",
  "payment",
  "suspicious_link",
  "isolation",
  "abusive_language",
  "other",
] as const;

export type IndicatorCategory = (typeof indicatorCategories)[number];

export const categoryLabels: Record<IndicatorCategory, string> = {
  urgency: "Urgency",
  impersonation: "Impersonation",
  sensitive_information: "Sensitive information",
  payment: "Payment",
  suspicious_link: "Suspicious link",
  isolation: "Isolation",
  abusive_language: "Abusive language",
  other: "Other",
};

/**
 * What the excerpt may indicate. Separate from tactic categories such as
 * urgency or payment. A type is shown only when an indicator id supports it.
 */
export const concernTypes = [
  "scam_fraud",
  "impersonation",
  "harassment_abuse",
  "coercion_manipulation",
  "privacy_exposure",
  "meetup_pressure",
] as const;

export type ConcernType = (typeof concernTypes)[number];

export const concernTypeLabels: Record<ConcernType, string> = {
  scam_fraud: "Scam or fraud",
  impersonation: "Impersonation",
  harassment_abuse: "Harassment or abuse",
  coercion_manipulation: "Coercion or manipulation",
  privacy_exposure: "Privacy exposure",
  meetup_pressure: "Meetup pressure",
};

export const severities = ["low", "moderate", "high"] as const;

export type Severity = (typeof severities)[number];

export const textualSupports = ["direct", "contextual"] as const;

export type TextualSupport = (typeof textualSupports)[number];

export const evidenceStrengths = [
  "direct",
  "context_dependent",
  "insufficient",
] as const;

export type EvidenceStrength = (typeof evidenceStrengths)[number];

export const evidenceStrengthLabels: Record<EvidenceStrength, string> = {
  direct: "Direct textual support",
  context_dependent: "Context-dependent support",
  insufficient: "Insufficient evidence",
};

export const confidenceLevels = ["high", "medium", "low"] as const;

export type Confidence = (typeof confidenceLevels)[number];

export const confidenceLabels: Record<Confidence, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export type { Analysis, Indicator, SafeAction } from "./contract";
