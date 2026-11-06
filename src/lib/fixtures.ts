import type { Analysis } from "@/lib/analysis";
import { finalizeAnalysis } from "@/lib/concern-rubric";
import {
  analyzeSuccessSchema,
  defaultMessageContext,
  type AnalyzeSuccess,
  type MessageContext,
} from "@/lib/contract";
import { examplePrompts } from "@/lib/examples";

export type ExampleFixture = {
  id: string;
  title: string;
  message: string;
  /** Short label for the practice picker. */
  practiceNote: string;
  context: MessageContext;
  analysis: Analysis;
};

const sharedLimitations =
  "The words in a message cannot establish who sent it or the real status of an account, payment, or appointment.";

export const exampleFixtures = [
  {
    id: examplePrompts[0].id,
    title: examplePrompts[0].title,
    message: examplePrompts[0].message,
    practiceNote: "Obvious phishing: short deadline, identity step, and a link in the text.",
    context: { ...defaultMessageContext },
    analysis: finalizeAnalysis({
      summary:
        "This message sets a 30-minute deadline and presses you to verify your identity through an address included in the text. That is enough to slow down. This preview cannot confirm that a bank sent it or that an account is restricted.",
      indicators: [
        {
          id: "i1",
          category: "urgency",
          evidence: "in 30 minutes",
          explanation:
            "This gives you a short deadline. A tight clock is a way to rush a decision before you can check the claim through a channel you already trust.",
          confidence: "high",
          severity: "moderate",
          support: "contextual",
        },
        {
          id: "i2",
          category: "sensitive_information",
          evidence: "Verify your identity immediately",
          explanation:
            "This pushes you to take an identity step right away. The wording does not show who is asking. A bank can still be reached through an app or contact method you already know.",
          confidence: "high",
          severity: "high",
          support: "direct",
        },
        {
          id: "i3",
          category: "suspicious_link",
          evidence: "https://account-check.example",
          explanation:
            "This address is printed in the message. This preview has not opened or checked it. A link by itself is not proof of fraud, and it also should not be trusted just because the message tells you to use it.",
          confidence: "medium",
          severity: "low",
          support: "contextual",
        },
      ],
      concernTypes: [
        { type: "scam_fraud", indicatorIds: ["i1", "i2"] },
        { type: "privacy_exposure", indicatorIds: ["i2"] },
      ],
      safeActions: [
        {
          title: "Check through a method you already trust",
          explanation:
            "Open your bank’s official app, or use a website or phone number from your card, a statement, or a lookup you started yourself. Do not use the address in this message.",
        },
        {
          title: "Wait before sharing identity details",
          explanation:
            "You can find out whether a restriction is real without proving your identity through this message.",
        },
      ],
      limitations: sharedLimitations,
    }),
  },
  {
    id: examplePrompts[1].id,
    title: examplePrompts[1].title,
    message: examplePrompts[1].message,
    practiceNote: "Urgency plus claimed IT support and a login link in the message.",
    context: { ...defaultMessageContext },
    analysis: finalizeAnalysis({
      summary:
        "This message claims to be IT support, warns that email will stop soon, and points you to a sign-in address in the text. Treat that combination as a reason to pause. This assessment cannot verify that IT sent it or that storage is full.",
      indicators: [
        {
          id: "i1",
          category: "impersonation",
          evidence: "This is IT Support",
          explanation:
            "The text claims an IT role. The words alone do not prove the sender works for your organization.",
          confidence: "medium",
          severity: "moderate",
          support: "direct",
        },
        {
          id: "i2",
          category: "urgency",
          evidence: "within one hour",
          explanation:
            "A short deadline pushes a quick sign-in. You can still check mailbox status through a channel you already use.",
          confidence: "high",
          severity: "moderate",
          support: "contextual",
        },
        {
          id: "i3",
          category: "suspicious_link",
          evidence: "https://mail-reset.example",
          explanation:
            "The sign-in address is printed in the message. This assessment has not opened it. Prefer a bookmark or app you already trust.",
          confidence: "medium",
          severity: "low",
          support: "contextual",
        },
      ],
      concernTypes: [
        { type: "impersonation", indicatorIds: ["i1"] },
        { type: "scam_fraud", indicatorIds: ["i2", "i3"] },
      ],
      safeActions: [
        {
          title: "Use your usual IT or email channel",
          explanation:
            "Open the email app or IT help page you already use, or call a number from your organization’s directory. Do not use the address in this message.",
        },
        {
          title: "Do not sign in from this message",
          explanation:
            "You can check storage or account status without following a link that arrived in an unexpected warning.",
        },
      ],
      limitations: sharedLimitations,
    }),
  },
  {
    id: examplePrompts[2].id,
    title: examplePrompts[2].title,
    message: examplePrompts[2].message,
    practiceNote: "A routine reminder that can look cautious at first glance.",
    context: { ...defaultMessageContext },
    analysis: finalizeAnalysis({
      summary:
        "No specific warning signs identified in this message. That does not authenticate the sender or guarantee the message is safe.",
      indicators: [],
      concernTypes: [],
      unscoredReading: "no_specific_concern",
      safeActions: [
        {
          title: "Compare it with your own booking records",
          explanation:
            "If you do not recognize the appointment, look it up in the confirmation or account you already have. Use the contact details saved there.",
        },
      ],
      limitations: sharedLimitations,
    }),
  },
  {
    id: examplePrompts[3].id,
    title: examplePrompts[3].title,
    message: examplePrompts[3].message,
    practiceNote: "Ambiguous without context: a password request that may or may not be expected.",
    context: {
      apparentSender: "not_sure",
      expected: "not_sure",
    },
    analysis: finalizeAnalysis({
      summary:
        "The text asks for a wifi password and mentions being downstairs. Without confirmed context about who sent it, that request is worth treating carefully. This assessment cannot verify the sender or the door-code claim.",
      indicators: [
        {
          id: "i1",
          category: "sensitive_information",
          evidence: "apartment wifi password",
          explanation:
            "A wifi password is a shared credential. Whether that request is routine depends on who sent the message and whether you were expecting it. The text alone does not settle that.",
          confidence: "medium",
          severity: "moderate",
          support: "direct",
        },
      ],
      concernTypes: [{ type: "privacy_exposure", indicatorIds: ["i1"] }],
      safeActions: [
        {
          title: "Confirm the person another way",
          explanation:
            "If you know who should be downstairs, check through a call or thread you already trust. Do not rely only on this message.",
        },
        {
          title: "You can decline to send the password",
          explanation:
            "Sharing a wifi password is optional. If anything feels off, wait until you can verify the request in person or through a known channel.",
        },
      ],
      limitations: sharedLimitations,
    }),
  },
] satisfies ExampleFixture[];

export function getExampleFixture(id: string): ExampleFixture | undefined {
  return exampleFixtures.find((fixture) => fixture.id === id);
}

/** Builds the AnalyzeSuccess envelope used by the demo results UI. */
export function demoAnalyzeSuccess(fixture: ExampleFixture): AnalyzeSuccess {
  return analyzeSuccessSchema.parse({
    ok: true,
    mode: "demo",
    context: fixture.context,
    analysis: fixture.analysis,
  });
}
