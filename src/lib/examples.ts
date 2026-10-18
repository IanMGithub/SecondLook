export type ExamplePrompt = {
  id: string;
  title: string;
  message: string;
};

export const examplePrompts = [
  {
    id: "urgent-account",
    title: "Urgent account warning",
    message:
      "ALERT: Your bank account will be restricted in 30 minutes. Verify your identity immediately at https://account-check.example to avoid suspension.",
  },
  {
    id: "marketplace-overpayment",
    title: "Marketplace overpayment",
    message:
      "I'll send a check for $500 more than your asking price. Please wire the extra money to my mover once you deposit it.",
  },
  {
    id: "routine-reminder",
    title: "Routine reminder",
    message:
      "Reminder: Your appointment is tomorrow at 10 AM. If you need to make changes, use the contact details in your original booking confirmation.",
  },
] as const satisfies readonly ExamplePrompt[];
