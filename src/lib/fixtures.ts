import type { Analysis } from "@/lib/analysis";
import { finalizeAnalysis } from "@/lib/concern-rubric";
import { examplePrompts } from "@/lib/examples";

export type ExampleFixture = {
  id: string;
  title: string;
  message: string;
  analysis: Analysis;
};

const sharedLimitations =
  "The words in a message cannot establish who sent it or the real status of an account, payment, or appointment.";

export const exampleFixtures = [
  {
    id: examplePrompts[0].id,
    title: examplePrompts[0].title,
    message: examplePrompts[0].message,
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
    analysis: finalizeAnalysis({
      summary:
        "This message offers a check for more than the asking price and asks you to wire the extra money onward. That combination is a reason to pause. This preview has not inspected a check and cannot say whether one would be paid.",
      indicators: [
        {
          id: "i1",
          category: "payment",
          evidence: "$500 more than your asking price",
          explanation:
            "This describes an overpayment. The preview has not seen or inspected a check. The extra amount matters because it is the money you would be asked to pass on.",
          confidence: "high",
          severity: "high",
          support: "direct",
        },
        {
          id: "i2",
          category: "payment",
          evidence: "wire the extra money",
          explanation:
            "This asks you to wire the extra amount to someone else after a deposit. A wire is difficult to undo. The request itself is the warning sign. It does not prove that a mover or a check is real.",
          confidence: "high",
          severity: "high",
          support: "direct",
        },
      ],
      concernTypes: [{ type: "scam_fraud", indicatorIds: ["i1", "i2"] }],
      safeActions: [
        {
          title: "Do not send the extra payment",
          explanation:
            "You can refuse to wire money beyond the agreed price, including an amount described as extra for a mover.",
        },
        {
          title: "Ask your own bank about a deposited check",
          explanation:
            "If a check is already deposited, contact your bank through an app or number you already trust and ask whether the funds are actually available. Do not follow payment instructions from this message while you wait.",
        },
      ],
      limitations: sharedLimitations,
    }),
  },
  {
    id: examplePrompts[2].id,
    title: examplePrompts[2].title,
    message: examplePrompts[2].message,
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
] satisfies ExampleFixture[];
