import type { Analysis } from "@/lib/analysis";

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
    id: "urgent-account",
    title: "Urgent account warning",
    message:
      "ALERT: Your bank account will be restricted in 30 minutes. Verify your identity immediately at https://account-check.example to avoid suspension.",
    analysis: {
      assessment: "high_concern",
      summary:
        "This message sets a 30-minute deadline and presses you to verify your identity through an address included in the text. That is enough to slow down. This preview cannot confirm that a bank sent it or that an account is restricted.",
      indicators: [
        {
          category: "urgency",
          evidence: "in 30 minutes",
          explanation:
            "This gives you a short deadline. A tight clock is a way to rush a decision before you can check the claim through a channel you already trust.",
          confidence: "high",
        },
        {
          category: "sensitive_information",
          evidence: "Verify your identity immediately",
          explanation:
            "This pushes you to take an identity step right away. The wording does not show who is asking. A bank can still be reached through an app or contact method you already know.",
          confidence: "high",
        },
        {
          category: "suspicious_link",
          evidence: "https://account-check.example",
          explanation:
            "This address is printed in the message. This preview has not opened or checked it. A link by itself is not proof of fraud, and it also should not be trusted just because the message tells you to use it.",
          confidence: "medium",
        },
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
    },
  },
  {
    id: "marketplace-overpayment",
    title: "Marketplace overpayment",
    message:
      "I'll send a check for $500 more than your asking price. Please wire the extra money to my mover once you deposit it.",
    analysis: {
      assessment: "high_concern",
      summary:
        "This message offers a check for more than the asking price and asks you to wire the extra money onward. That combination is a reason to pause. This preview has not inspected a check and cannot say whether one would be paid.",
      indicators: [
        {
          category: "payment",
          evidence: "$500 more than your asking price",
          explanation:
            "This describes an overpayment. The preview has not seen or inspected a check. The extra amount matters because it is the money you would be asked to pass on.",
          confidence: "high",
        },
        {
          category: "payment",
          evidence: "wire the extra money",
          explanation:
            "This asks you to wire the extra amount to someone else after a deposit. A wire is difficult to undo. The request itself is the warning sign. It does not prove that a mover or a check is real.",
          confidence: "high",
        },
      ],
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
    },
  },
  {
    id: "routine-reminder",
    title: "Routine reminder",
    message:
      "Reminder: Your appointment is tomorrow at 10 AM. If you need to make changes, use the contact details in your original booking confirmation.",
    analysis: {
      assessment: "unclear",
      summary:
        "No selected warning signs are illustrated in this fixture. That does not authenticate the sender or prove safety.",
      indicators: [],
      safeActions: [
        {
          title: "Compare it with your own booking records",
          explanation:
            "If you do not recognize the appointment, look it up in the confirmation or account you already have. Use the contact details saved there.",
        },
      ],
      limitations: sharedLimitations,
    },
  },
] satisfies ExampleFixture[];

export function findExampleAnalysis(message: string): Analysis | undefined {
  return exampleFixtures.find((example) => example.message === message)
    ?.analysis;
}
