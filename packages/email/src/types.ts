export type EmailProvider = "gmail" | "imap";

export type EmailConnectionConfig = {
  provider: EmailProvider;
  userId: string;
};

export type ImapConnectionConfig = {
  provider: "imap";
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  mailbox: string;
  maxMessages?: number;
};

export type EmailConnector = {
  id: EmailProvider;
  connect(config: EmailConnectionConfig): Promise<void>;
  disconnect(userId: string): Promise<void>;
};

export type RawEmailMessage = {
  provider: EmailProvider;
  providerMessageId: string;
  threadId?: string | null;
  from: string;
  subject?: string | null;
  receivedAt: Date;
  text?: string | null;
  html?: string | null;
};

export type NormalizedEmailMessage = {
  provider: EmailProvider;
  providerMessageId: string;
  threadId: string | null;
  fromEmail: string | null;
  fromDomain: string | null;
  subject: string | null;
  receivedAt: Date;
  text: string;
};

export type ExtractedEmailMetadata = {
  provider: EmailProvider;
  providerMessageId: string;
  threadId: string | null;
  fromEmail: string | null;
  fromDomain: string | null;
  subject: string | null;
  subjectHash: string;
  receivedAt: Date;
  subjectTokens: string[];
  bodyTokens: string[];
  links: string[];
  domains: string[];
};

export type EmailAssertionType =
  | "application_received"
  | "assessment"
  | "interview_request"
  | "rejection"
  | "offer"
  | "follow_up";

export type EmailAssertion = {
  type: EmailAssertionType;
  confidence: number;
  summary: string;
  evidence: string[];
  ruleIds: string[];
  blockingReasons: string[];
};

export type OpportunityMatchTarget = {
  id: string;
  title: string;
  companyName: string;
  companyDomain: string | null;
  sourceUrl: string | null;
};

export type OpportunityMatch = {
  opportunityId: string;
  score: number;
  reasons: string[];
};

export type EmailSuggestionDraft = {
  messageRef: {
    provider: EmailProvider;
    providerMessageId: string;
    threadId: string | null;
    fromEmail: string | null;
    fromDomain: string | null;
    subject: string | null;
    subjectHash: string;
    receivedAt: Date;
    metadata: {
      links: string[];
      domains: string[];
    };
  };
  assertion: EmailAssertion;
  match: OpportunityMatch | null;
  candidateMatches: OpportunityMatch[];
  proposedEvent: {
    type: string;
    source: "email";
    metadata: Record<string, unknown>;
    confidence: number;
  };
};
