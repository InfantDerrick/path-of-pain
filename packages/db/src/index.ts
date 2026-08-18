export { type Database, db, schema, sql } from "./client";
export { createId } from "./ids";
export { getDashboard } from "./queries/dashboard";
export {
  confirmEmailSuggestion,
  createEmailSuggestionsFromDrafts,
  createEmailSuggestionsFromMessages,
  ensureLocalEmailConnection,
  getEmailConnectionSyncTarget,
  listActiveEmailConnectionsForSync,
  listEmailConnections,
  listOpportunityMatchTargets,
  listPendingEmailSuggestions,
  markEmailConnectionSyncFailed,
  markEmailConnectionSyncStarted,
  markEmailConnectionSyncSucceeded,
  resolveEmailSuggestion,
  upsertImapEmailConnection,
} from "./queries/email-suggestions";
export {
  addAttachment,
  addInterview,
  addNote,
  addOpportunityContact,
  addTask,
  createOpportunity,
  DuplicateOpportunityError,
  discardOpportunity,
  enrichOpportunityFromExtraction,
  getAttachmentDownload,
  getOpportunityDetail,
  getSnapshotDownload,
  listOpportunities,
  listPendingEnrichmentTargets,
  markOpportunityEnrichmentFailed,
  markOpportunityEnrichmentQueued,
  markOpportunityEnrichmentRunning,
  moveOpportunityStage,
  OpportunityNotFoundError,
  updateOpportunity,
  updateTask,
} from "./queries/opportunities";
export {
  ensurePipelineStages,
  getAllStages,
  getStageBySlug,
  getVisibleStages,
  updatePipelineStages,
} from "./queries/pipeline";
export {
  ENRICH_OPPORTUNITY_QUEUE,
  enqueueEmailConnectionSync,
  enqueueOpportunityEnrichment,
  getBoss,
  SYNC_EMAIL_CONNECTION_QUEUE,
  startBoss,
} from "./queue";
export * from "./schema/index";
