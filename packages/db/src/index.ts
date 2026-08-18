export { type Database, db, schema, sql } from "./client";
export { createId } from "./ids";
export { getDashboard } from "./queries/dashboard";
export {
  addInterview,
  addNote,
  addTask,
  createOpportunity,
  discardOpportunity,
  DuplicateOpportunityError,
  enrichOpportunityFromExtraction,
  getOpportunityDetail,
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
  enqueueOpportunityEnrichment,
  getBoss,
  startBoss,
} from "./queue";
export * from "./schema/index";
