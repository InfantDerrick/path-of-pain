export { classifyEmailMessage, eventTypeForAssertion } from "./classifier";
export { decryptJson, encryptJson } from "./crypto";
export { fetchRecentImapMessages, testImapConnection } from "./imap";
export { matchOpportunities } from "./matcher";
export {
  extractEmailAddress,
  extractEmailMetadata,
  normalizeEmailMessage,
  tokenize,
} from "./normalize";
export { buildEmailSuggestionDrafts } from "./suggestions";
export type {
  EmailAssertion,
  EmailAssertionType,
  EmailConnectionConfig,
  EmailConnector,
  EmailProvider,
  EmailSuggestionDraft,
  ExtractedEmailMetadata,
  ImapConnectionConfig,
  NormalizedEmailMessage,
  OpportunityMatch,
  OpportunityMatchTarget,
  RawEmailMessage,
} from "./types";
