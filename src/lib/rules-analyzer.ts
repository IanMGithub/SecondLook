import type { ConcernType } from "./analysis";
import { apparentSenders, messageExpectations } from "./analysis";
import { finalizeAnalysis } from "./concern-rubric";
import {
  defaultMessageContext,
  type Analysis,
  type FallbackReason,
  type Indicator,
  type MessageContext,
} from "./contract";
import { dedupeIndicators } from "./validate-evidence";

/**
 * Limited literal patterns. A nearby "never" or "do not" suppresses a
 * request match, but these rules cannot understand every sentence.
 * They do not treat "bank", a URL, or a mention of money as a warning by itself.
 *
 * User-reported context is not an input. These patterns do not know who a
 * sender is, whether a message was expected, or whether a relationship makes
 * a request ordinary. They do not lower a match because the apparent sender
 * is familiar. Context stays outside the message and is never copied into
 * indicator evidence.
 */

const allowedContext = new Set<string>([...apparentSenders, ...messageExpectations]);

function contextIsLabelOnly(context: MessageContext): boolean {
  return allowedContext.has(context.apparentSender) && allowedContext.has(context.expected);
}

const NEGATION =
  /\b(?:never|do not|don't|dont|avoid)\b/i;

const DEADLINE =
  /\b(?:within|in)\s+\d{1,3}\s+(?:minutes?|hours?)\b/i;

const ACCOUNT_RESTRICTION =
  /\b(?:account|access)\s+will\s+be\s+(?:restricted|suspended|closed|locked|disabled|frozen)\b/i;

const CREDENTIAL_REQUEST =
  /\b(?:send|share|tell|give|provide|enter|confirm|text)\s+(?:me\s+|us\s+)?(?:your\s+)?(?:password|passcode|pin|verification code|one-time code|security code)\b/i;

const PAYMENT_DEMAND =
  /\b(?:pay with|send|buy|purchase)\s+(?:me\s+|us\s+|a\s+|an\s+|some\s+)?(?:gift cards?|google play cards?|itunes cards?|bitcoin|btc|cryptocurrency|crypto|ethereum|usdt)\b/i;

const OVERPAYMENT =
  /(?:\$\d[\d,]*(?:\.\d+)?\s+more than|\bmore than (?:your|the) (?:asking )?price\b|\boverpayment\b|\bextra money\b)/i;

const SEND_EXCESS =
  /\b(?:wire|send|return|forward|refund)\s+(?:me\s+|us\s+|back\s+)?(?:the\s+)?(?:extra|excess|difference|overpayment)\b/i;

const PRIVATE_DETAILS =
  /\b(?:send|share|tell|give|provide|text)\s+(?:me\s+|us\s+)?(?:your\s+)?(?:home address|social security number|ssn|bank account number)\b/i;

const MEETING =
  /\b(?:meet me|meet you|meet for|meet up|let's meet|lets meet|let us meet|come over|come to the meeting)\b/i;

const ISOLATION =
  /\b(?:come alone|keep this secret|keep it secret|don'?t tell anyone|do not tell anyone|dont tell anyone|don'?t bring anyone|do not bring anyone)\b/i;

const RULES_LIMITATION =
  "This is limited rules-based analysis. It does not establish who sent the message or whether an account, payment, or link is real. No matching pattern does not mean the message is safe. These rules can link scam or fraud, privacy exposure, and meetup pressure. They do not identify harassment, personal coercion, or impersonation. A normal meeting invitation is not meetup pressure. An ordinary deadline, reimbursement, photo request, or organization name is not a warning by itself. User-reported context is recorded separately and is not used by these patterns. The rules do not know whether a sender is familiar or whether a message was expected, and they do not lower a match for that reason. The concern index uses rubric concern-index-v2 and is not a probability of fraud or harm.";

const FALLBACK_NOTES: Record<FallbackReason, string> = {
  not_configured:
    "Live model analysis is not configured, so this result uses limited rules only.",
  timeout:
    "The model analysis did not finish in time, so this result uses limited rules only.",
  rate_limited:
    "The model analysis was rate limited, so this result uses limited rules only.",
  provider_error:
    "The model analysis was unavailable, so this result uses limited rules only.",
  invalid_output:
    "The model analysis could not be checked against this message, so this result uses limited rules only.",
};

const VERIFY_INDEPENDENTLY = {
  title: "Verify through a channel you already trust",
  explanation:
    "Check an unexpected request through an app, number, or website you already use. Do not rely on contact details printed in this message.",
};

const KEEP_CREDENTIALS = {
  title: "Do not send the requested code or password",
  explanation:
    "You can refuse to share a password, PIN, or verification code asked for in this message. A service you already use can still be reached another way.",
};

const HOLD_PAYMENT = {
  title: "Do not send the requested payment yet",
  explanation:
    "Pause before buying a gift card, sending cryptocurrency, or forwarding extra money. Check the request with the organization or your bank through a method you already trust.",
};

const DECLINE_MEET = {
  title: "You can decline or change the plan",
  explanation:
    "You do not have to meet alone or keep a plan secret because a message says so. If you still want to meet, you can choose a place where you can leave and tell someone you already trust. This is not a finding that you are in danger.",
};

const KEEP_PERSONAL = {
  title: "Do not send the requested personal details",
  explanation:
    "You can refuse to share an address or government identifier asked for in this message. Use a channel you already have if an organization actually needs that information.",
};

const COMPARE_RECORDS = {
  title: "Compare it with what you already know",
  explanation:
    "If you do not recognize the message, compare it with your own records or an account you already use. These limited rules not finding a pattern does not show that the message is safe.",
};

function literalMatches(
  message: string,
  pattern: RegExp,
  respectNegation: boolean,
): string[] {
  const flags = pattern.flags.includes("g")
    ? pattern.flags
    : `${pattern.flags}g`;
  const globalPattern = new RegExp(pattern.source, flags);
  const matches: string[] = [];

  for (const match of message.matchAll(globalPattern)) {
    if (match.index === undefined) continue;
    if (respectNegation && isNegated(message, match.index)) continue;
    if (isQuoted(message, match.index, match[0].length)) continue;
    matches.push(match[0]);
  }

  return matches;
}

function isNegated(message: string, index: number): boolean {
  const window = message.slice(Math.max(0, index - 60), index);
  return NEGATION.test(window);
}

function isQuoted(message: string, index: number, length: number): boolean {
  return (
    insideSameMark(message, index, length, '"') ||
    insideDifferentMarks(message, index, length, "“", "”") ||
    insideDifferentMarks(message, index, length, "«", "»")
  );
}

function insideSameMark(
  message: string,
  index: number,
  length: number,
  mark: string,
): boolean {
  let count = 0;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (message.startsWith(mark, cursor)) count += 1;
  }
  if (count % 2 === 0) return false;
  return message.indexOf(mark, index + length) !== -1;
}

function insideDifferentMarks(
  message: string,
  index: number,
  length: number,
  open: string,
  close: string,
): boolean {
  const start = message.lastIndexOf(open, index - 1);
  if (start === -1) return false;
  const closed = message.lastIndexOf(close, index - 1);
  if (closed > start) return false;
  return message.indexOf(close, index + length) !== -1;
}

type Draft = {
  category: Indicator["category"];
  evidence: string;
  explanation: string;
  confidence: Indicator["confidence"];
  severity: Indicator["severity"];
  support: Indicator["support"];
  types: ConcernType[];
};

function draft(
  category: Draft["category"],
  evidence: string,
  explanation: string,
  confidence: Draft["confidence"],
  severity: Draft["severity"],
  support: Draft["support"],
  types: ConcernType[],
): Draft {
  return { category, evidence, explanation, confidence, severity, support, types };
}

export function analyzeWithRules(
  message: string,
  fallbackReason: FallbackReason,
  context: MessageContext = defaultMessageContext,
): Analysis {
  if (!contextIsLabelOnly(context)) {
    throw new Error("Context must be one of the allowed labels.");
  }
  const deadlines = literalMatches(message, DEADLINE, false);
  const restrictions = literalMatches(message, ACCOUNT_RESTRICTION, false);
  const credentials = literalMatches(message, CREDENTIAL_REQUEST, true);
  const payments = literalMatches(message, PAYMENT_DEMAND, true);
  const overpayments = literalMatches(message, OVERPAYMENT, false);
  const excessRequests = literalMatches(message, SEND_EXCESS, true);
  const privateDetails = literalMatches(message, PRIVATE_DETAILS, true);
  const meetings = literalMatches(message, MEETING, false);
  const isolations = meetings.length > 0 ? literalMatches(message, ISOLATION, true) : [];
  const overpaymentCombo = overpayments.length > 0 && excessRequests.length > 0;

  const drafts: Draft[] = [];

  if (restrictions.length > 0) {
    for (const evidence of deadlines) {
      drafts.push(
        draft(
          "urgency",
          evidence,
          "The text sets a short deadline beside a threat to restrict an account. That pairing is concerning because it can push a decision before you check another way. This rule does not show that an account is actually restricted, and it does not use who the message appears to be from.",
          "medium",
          "moderate",
          "contextual",
          ["scam_fraud"],
        ),
      );
    }
  }

  for (const evidence of restrictions) {
    drafts.push(
      draft(
        "urgency",
        evidence,
        "The text says an account or access will be restricted. That wording is concerning because it states a penalty, not because a deadline or a sender label is missing. It does not show who sent the message or whether an account is affected.",
        "medium",
        "moderate",
        "direct",
        ["scam_fraud"],
      ),
    );
  }

  for (const evidence of credentials) {
    drafts.push(
      draft(
        "sensitive_information",
        evidence,
        "The text asks for a password, PIN, or verification code. That request is concerning because the secret could let someone else act as the reader, including when the apparent sender seems familiar or the message was expected. These rules do not know who is asking.",
        "high",
        "high",
        "direct",
        ["scam_fraud", "privacy_exposure"],
      ),
    );
  }

  for (const evidence of privateDetails) {
    drafts.push(
      draft(
        "sensitive_information",
        evidence,
        "The text asks for a home address, government identifier, or bank account number. That request is concerning because the excerpt asks for the detail itself, not because every personal question is abuse. These rules do not know who is asking or whether an organization needs it.",
        "high",
        "high",
        "direct",
        ["privacy_exposure"],
      ),
    );
  }

  for (const evidence of payments) {
    drafts.push(
      draft(
        "payment",
        evidence,
        "The text asks for a gift card or cryptocurrency payment. That demand is concerning because of the payment method in the excerpt, not because every payment or reimbursement is fraud. This rule has not verified a recipient or a transaction.",
        "high",
        "high",
        "direct",
        ["scam_fraud"],
      ),
    );
  }

  if (overpaymentCombo) {
    for (const evidence of overpayments) {
      drafts.push(
        draft(
          "payment",
          evidence,
          "The text describes an amount above a price. Together with a request to pass money onward, that pairing is concerning. An ordinary reimbursement without that pairing is not this pattern. This rule has not inspected a check or a transfer.",
          "high",
          "high",
          "direct",
          ["scam_fraud"],
        ),
      );
    }
    for (const evidence of excessRequests) {
      drafts.push(
        draft(
          "payment",
          evidence,
          "The text asks you to send on extra money. Combined with an overpayment, that request is concerning. This rule has not seen the payment and does not know whether it was expected.",
          "high",
          "high",
          "direct",
          ["scam_fraud"],
        ),
      );
    }
  }

  for (const evidence of isolations) {
    drafts.push(
      draft(
        "isolation",
        evidence,
        "The text asks you to meet in secret, come alone, or not tell other people. That is concerning because of the secrecy or isolation in the excerpt, not because a meeting was mentioned. A familiar apparent sender does not remove the phrase. The wording does not show who is asking or whether anyone is in danger.",
        "high",
        "high",
        "direct",
        ["meetup_pressure"],
      ),
    );
  }

  const unique = dedupeIndicators(
    drafts.map((item) => ({
      id: "i1",
      category: item.category,
      evidence: item.evidence,
      explanation: item.explanation,
      confidence: item.confidence,
      severity: item.severity,
      support: item.support,
    })),
  );
  const kept = new Set(unique.map((item) => `${item.category}\u0000${item.evidence}`));
  const indicators = drafts
    .filter((item) => kept.has(`${item.category}\u0000${item.evidence}`))
    .filter(
      (item, index, all) =>
        all.findIndex(
          (other) => other.category === item.category && other.evidence === item.evidence,
        ) === index,
    )
    .map((item, index) => ({
      id: `i${index + 1}`,
      category: item.category,
      evidence: item.evidence,
      explanation: item.explanation,
      confidence: item.confidence,
      severity: item.severity,
      support: item.support,
      types: item.types,
    }));

  const concernTypes = new Map<ConcernType, string[]>();
  for (const indicator of indicators) {
    for (const type of indicator.types) {
      const ids = concernTypes.get(type) ?? [];
      ids.push(indicator.id);
      concernTypes.set(type, ids);
    }
  }

  const hasCredential = credentials.length > 0;
  const hasPrivateDetails = privateDetails.length > 0;
  const hasPaymentDemand = payments.length > 0;
  const hasMeetup = isolations.length > 0;
  const limitations = `${RULES_LIMITATION} ${FALLBACK_NOTES[fallbackReason]}`;
  const placeholder = finalizeAnalysis({
    summary: "Pending.",
    indicators: indicators.map((item) => ({
      id: item.id,
      category: item.category,
      evidence: item.evidence,
      explanation: item.explanation,
      confidence: item.confidence,
      severity: item.severity,
      support: item.support,
    })),
    concernTypes: [...concernTypes.entries()].map(([type, indicatorIds]) => ({
      type,
      indicatorIds,
    })),
    safeActions: [],
    limitations,
  });

  if (placeholder.assessment === "no_specific_concern") {
    throw new Error("Rules do not assign no specific concern.");
  }
  const summary = {
    high_concern:
      "These limited rules found an explicit request, or a deadline combined with an account threat. That is a reason to pause. It is not proof of fraud.",
    some_concern:
      "These limited rules found a warning sign, but not one of the stronger combinations. Check before acting. It is not proof of fraud.",
    unclear:
      "These limited rules did not find one of their specific warning patterns. That does not show the message is safe or identify the sender. It is not a finding that no warning signs exist.",
  }[placeholder.assessment];

  const safeActions = [];
  if (placeholder.assessment === "unclear") {
    safeActions.push(COMPARE_RECORDS);
  } else {
    safeActions.push(VERIFY_INDEPENDENTLY);
    if (hasCredential) safeActions.push(KEEP_CREDENTIALS);
    if (hasPrivateDetails) safeActions.push(KEEP_PERSONAL);
    if (hasPaymentDemand || overpaymentCombo) safeActions.push(HOLD_PAYMENT);
    if (hasMeetup) safeActions.push(DECLINE_MEET);
  }

  return finalizeAnalysis({
    summary,
    indicators: placeholder.indicators,
    concernTypes: placeholder.concernTypes,
    safeActions,
    limitations,
  });
}
