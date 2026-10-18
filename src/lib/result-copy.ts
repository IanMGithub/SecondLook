export const standingLimitations = [
  "The text alone cannot verify who sent the message or the status of an account.",
  "Links in the message are not visited or checked.",
  "Finding no warning signs does not establish that the message is safe.",
  "User-reported context is what you selected. It is not independent verification of the sender or that the message was expected.",
] as const;

/** One short visible qualification on the result. Full limitations stay in a disclosure. */
export const resultQualification =
  "Based on the message text and your reported context. This does not verify the sender.";

export const emptyIndicatorsCopy =
  "No warning signs were selected for this message. That does not establish that the message is safe, and it does not verify the sender.";

export const noSpecificConcernEvidenceCopy =
  "No specific warning signs identified in this message. This does not verify the sender or guarantee the message is safe.";

export const noSpecificConcernActionCopy =
  "No specific warning sign calls for a next step. This does not mean the message is guaranteed safe.";

export const contextConsideredIntro =
  "User-provided. Context helps interpret the message, but does not verify the sender.";

export const noConcernTypeCopy =
  "No potential concern type was linked to an excerpt.";

export const reportDisclaimer =
  "This report is not verification of fraud or of who sent the message.";

export const excerptSensitivityCopy =
  "Excerpts may also contain sensitive information.";
