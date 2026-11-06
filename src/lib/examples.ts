export type ExamplePrompt = {
  id: string;
  title: string;
  message: string;
};

/**
 * Fictional practice messages for the interactive demo and local examples.
 * Synthetic content only. Links use the .example TLD and are not fetched.
 */
export const examplePrompts = [
  {
    id: "urgent-account",
    title: "Urgent account warning",
    message:
      "ALERT: Your bank account will be restricted in 30 minutes. Verify your identity immediately at https://account-check.example to avoid suspension.",
  },
  {
    id: "it-support-impersonation",
    title: "IT support urgency",
    message:
      "This is IT Support. Your mailbox storage is full. Sign in at https://mail-reset.example within one hour or outbound email will stop.",
  },
  {
    id: "routine-reminder",
    title: "Routine reminder",
    message:
      "Reminder: Your appointment is tomorrow at 10 AM. If you need to make changes, use the contact details in your original booking confirmation.",
  },
  {
    id: "wifi-password-request",
    title: "Password request from a contact",
    message:
      "Hey, can you text me the apartment wifi password? I'm downstairs and the door code worked.",
  },
] as const satisfies readonly ExamplePrompt[];
