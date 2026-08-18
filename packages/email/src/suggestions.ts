import { classifyEmailMessage, eventTypeForAssertion } from "./classifier";
import { chooseBestMatch, matchOpportunities } from "./matcher";
import { extractEmailMetadata, normalizeEmailMessage } from "./normalize";
import type {
  EmailSuggestionDraft,
  OpportunityMatchTarget,
  RawEmailMessage,
} from "./types";

export function buildEmailSuggestionDrafts(
  message: RawEmailMessage,
  opportunities: OpportunityMatchTarget[],
): EmailSuggestionDraft[] {
  const normalized = normalizeEmailMessage(message);
  const metadata = extractEmailMetadata(normalized);
  const assertion = classifyEmailMessage(normalized);
  if (!assertion) {
    return [];
  }

  const candidateMatches = matchOpportunities(metadata, opportunities);
  const match = chooseBestMatch(candidateMatches);
  if (!match) {
    return [];
  }

  return [
    {
      messageRef: {
        provider: metadata.provider,
        providerMessageId: metadata.providerMessageId,
        threadId: metadata.threadId,
        fromEmail: metadata.fromEmail,
        fromDomain: metadata.fromDomain,
        subject: metadata.subject,
        subjectHash: metadata.subjectHash,
        receivedAt: metadata.receivedAt,
        metadata: {
          links: metadata.links,
          domains: metadata.domains,
        },
      },
      assertion,
      match,
      candidateMatches,
      proposedEvent: {
        type: eventTypeForAssertion(assertion.type),
        source: "email",
        confidence: assertion.confidence,
        metadata: {
          assertionType: assertion.type,
          summary: assertion.summary,
          evidence: assertion.evidence,
          matchReasons: match.reasons,
          messageSubjectHash: metadata.subjectHash,
          fromDomain: metadata.fromDomain,
        },
      },
    },
  ];
}
