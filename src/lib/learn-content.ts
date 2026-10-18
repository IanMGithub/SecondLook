export type LearnPattern = {
  id: string;
  title: string;
  summary: string;
  example: string;
  watchFor: string;
  verify: string;
  details: string;
};

export type LearnSource = {
  href: string;
  label: string;
};

export const learnPatterns: readonly LearnPattern[] = [
  {
    id: "urgency",
    title: "Urgency and threats",
    summary:
      "A short deadline or a threat of arrest, a lawsuit, or a shut-off is a common way to rush a decision.",
    example:
      "Northwind Mutual: Your account will be closed in 30 minutes unless you confirm today.",
    watchFor: "Pressure to pay, click, or reply before you can check another way.",
    verify:
      "Contact the organization through a number or website you already know, not through the message.",
    details:
      "The Federal Trade Commission says scammers pressure people to act before they can check. Urgency by itself does not prove a message is fraudulent. A real appointment, outage, or delivery can also be time-sensitive.",
  },
  {
    id: "impersonation",
    title: "Impersonation",
    summary:
      "Someone may pretend to be a government agency, a company you know, or another organization.",
    example:
      "This is Jordan from Cedar Clinic billing. I need to confirm your account before your appointment.",
    watchFor: "A familiar name or caller ID used as if it proves who sent the message.",
    verify:
      "Look up the organization yourself and use the contact details you find there.",
    details:
      "The Federal Trade Commission describes this as a common pattern. A familiar name or a caller ID display does not show who sent the message. The FTC says the number you see can be faked.",
  },
  {
    id: "credentials",
    title: "Password and verification-code requests",
    summary:
      "A password, PIN, or verification code can be used to sign in as you.",
    example: "Please read me the verification code that was just sent to you.",
    watchFor: "A request for a code or password you did not begin yourself.",
    verify:
      "Do not send the code or password. Open the account through an app or website you already use.",
    details:
      "The Federal Trade Commission advises against giving personal or financial information in response to a request you did not expect. CISA lists requests for personal information as a common phishing sign.",
  },
  {
    id: "payment",
    title: "Gift-card and crypto payment demands",
    summary:
      "Gift cards and cryptocurrency are payment methods that are hard to reverse once sent.",
    example:
      "Buy a gift card and send me the numbers on the back to keep your service on.",
    watchFor: "A demand to pay only with a gift card, cryptocurrency, wire, or payment app.",
    verify:
      "Do not buy the card or send cryptocurrency because of the message. Check the request another way.",
    details:
      "The Federal Trade Commission says no real business or government agency will tell you to pay with a gift card. Its guidance also says scammers insist on cryptocurrency, a payment app, or a wire transfer. If you already paid, contact the card issuer or the company you used, and you can report it to the FTC.",
  },
  {
    id: "overpayment",
    title: "Overpayment and refund requests",
    summary:
      "Someone may pay more than they owe and ask you to return the difference before the payment clears.",
    example: "I sent $500 more than the invoice. Please return the excess.",
    watchFor: "Extra money in an account paired with a request to send the difference back.",
    verify:
      "Do not send money back yet. Ask your bank, using a number you look up yourself, before you treat the payment as final.",
    details:
      "The Federal Trade Commission describes a fake-check pattern: someone pays more than they owe and asks for the difference back. Money that appears in an account does not mean a payment has cleared. The FTC says it can take weeks for a bank to discover a fake check.",
  },
  {
    id: "links",
    title: "Unexpected links and login requests",
    summary:
      "An unexpected link or login request can be a way to collect a password or send you to a lookalike page.",
    example:
      "Your package is waiting. Sign in at https://harbor-parcel.example to choose a delivery time.",
    watchFor: "An unfamiliar address, or a small difference in a web address you recognize.",
    verify:
      "Do not use the link or a phone number from the message. Type an address you already know.",
    details:
      "CISA says phishing messages often look like they come from a trusted organization and try to get you to open a link or sign in. An unfamiliar address is a reason to pause. It does not by itself prove fraud. CISA also notes that some phishing messages now have correct spelling and grammar, so a polished message is not proof that it is legitimate.",
  },
];

export const learnPlaybook: readonly string[] = [
  "Pause before acting. The Federal Trade Commission recommends resisting pressure to pay or to hand over personal information immediately.",
  "Verify through contact details you already know. Do not use the number, link, or caller ID from the message. CISA says to look up the company or person another way.",
  "Protect sensitive information. Do not give a password, verification code, or account number because a message asked for it.",
  "Check payment requests independently. Do not pay with a gift card, cryptocurrency, or a wire just because a message says that is the only way. Do not return money from a check until you know the payment is final.",
  "If you already acted, contact the bank, card issuer, or service promptly through a number or website you look up yourself. You can also tell the Federal Trade Commission at ReportFraud.ftc.gov.",
];

export const learnSources: readonly LearnSource[] = [
  {
    href: "https://consumer.ftc.gov/articles/how-avoid-scam",
    label: "Federal Trade Commission: How To Avoid a Scam",
  },
  {
    href: "https://consumer.ftc.gov/articles/gift-card-scams",
    label: "Federal Trade Commission: Avoiding and Reporting Gift Card Scams",
  },
  {
    href: "https://consumer.ftc.gov/articles/how-spot-avoid-and-report-fake-check-scams",
    label: "Federal Trade Commission: How To Spot, Avoid, and Report Fake Check Scams",
  },
  {
    href: "https://www.cisa.gov/secure-our-world/recognize-and-report-phishing",
    label: "CISA: Recognize and Report Phishing",
  },
];
