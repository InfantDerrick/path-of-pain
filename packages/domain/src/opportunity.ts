export const opportunityStatuses = [
  "ACTIVE",
  "REJECTED",
  "GHOSTED",
  "WITHDRAWN",
  "ACCEPTED",
  "EXPIRED",
  "CLOSED",
] as const;

export type OpportunityStatus = (typeof opportunityStatuses)[number];

export const terminalStatuses: readonly OpportunityStatus[] = [
  "REJECTED",
  "GHOSTED",
  "WITHDRAWN",
  "ACCEPTED",
  "EXPIRED",
  "CLOSED",
];

export const eventTypes = [
  "JOB_SAVED",
  "APPLICATION_SUBMITTED",
  "OA_RECEIVED",
  "RECRUITER_CONTACTED",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_COMPLETED",
  "STAGE_CHANGED",
  "REJECTED",
  "GHOSTED",
  "OFFER_RECEIVED",
  "OFFER_ACCEPTED",
  "WITHDRAWN",
  "NOTE_ADDED",
  "TASK_ADDED",
  "TASK_COMPLETED",
  "TASK_REOPENED",
  "DOCUMENT_ADDED",
  "CONTACT_ADDED",
  "ATTACHMENT_ADDED",
  "SNAPSHOT_CAPTURED",
  "JOB_ENRICHED",
  "JOB_ENRICHMENT_FAILED",
] as const;

export type EventType = (typeof eventTypes)[number];

export const captureSources = [
  "web",
  "extension",
  "mobile",
  "import",
  "email",
] as const;

export type CaptureSource = (typeof captureSources)[number];

export const workplaceTypes = [
  "REMOTE",
  "HYBRID",
  "ONSITE",
  "UNKNOWN",
] as const;

export type WorkplaceType = (typeof workplaceTypes)[number];

export const attachmentKinds = [
  "resume",
  "recruiter_doc",
  "offer_doc",
  "other",
] as const;

export type AttachmentKind = (typeof attachmentKinds)[number];
