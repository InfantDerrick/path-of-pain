export { type Database, db, schema, sql } from "./client";
export { createId } from "./ids";
export {
  addNote,
  createOpportunity,
  DuplicateOpportunityError,
  getOpportunityDetail,
  listOpportunities,
  OpportunityNotFoundError,
  updateOpportunity,
} from "./queries/opportunities";
export {
  ensurePipelineStages,
  getStageBySlug,
  getVisibleStages,
} from "./queries/pipeline";
export * from "./schema/index";
