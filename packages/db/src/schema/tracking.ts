import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const company = pgTable(
  "company",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    nameNormalized: text("name_normalized").notNull(),
    domain: text("domain"),
    logoUrl: text("logo_url"),
    ...timestamps,
  },
  (table) => [
    index("company_user_id_idx").on(table.userId),
    uniqueIndex("company_user_name_uidx").on(
      table.userId,
      table.nameNormalized,
    ),
  ],
);

export const pipelineStage = pgTable(
  "pipeline_stage",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    orderIndex: integer("order_index").notNull(),
    terminalType: text("terminal_type"),
    hidden: boolean("hidden").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("pipeline_stage_user_order_uidx").on(
      table.userId,
      table.orderIndex,
    ),
    uniqueIndex("pipeline_stage_user_slug_uidx").on(table.userId, table.slug),
  ],
);

export const opportunity = pgTable(
  "opportunity",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    sourceUrl: text("source_url"),
    normalizedSourceUrl: text("normalized_source_url"),
    status: text("status").notNull().default("ACTIVE"),
    currentStageId: text("current_stage_id")
      .notNull()
      .references(() => pipelineStage.id),
    captureSource: text("capture_source").notNull().default("web"),
    location: text("location"),
    workplaceType: text("workplace_type").notNull().default("UNKNOWN"),
    compensation: text("compensation"),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...timestamps,
  },
  (table) => [
    index("opportunity_user_activity_idx").on(
      table.userId,
      table.lastActivityAt,
    ),
    index("opportunity_user_stage_idx").on(table.userId, table.currentStageId),
    uniqueIndex("opportunity_user_url_uidx")
      .on(table.userId, table.normalizedSourceUrl)
      .where(sql`${table.normalizedSourceUrl} is not null`),
  ],
);

export const jobPosting = pgTable("job_posting", {
  id: text("id").primaryKey(),
  opportunityId: text("opportunity_id")
    .notNull()
    .unique()
    .references(() => opportunity.id, { onDelete: "cascade" }),
  location: text("location"),
  workplaceType: text("workplace_type"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  salaryCurrency: text("salary_currency"),
  descriptionHtml: text("description_html"),
  descriptionText: text("description_text"),
  externalJobId: text("external_job_id"),
  employmentType: text("employment_type"),
  sourceType: text("source_type"),
  enrichmentStatus: text("enrichment_status").notNull().default("IDLE"),
  enrichmentError: text("enrichment_error"),
  ...timestamps,
});

export const opportunityEvent = pgTable(
  "opportunity_event",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunity.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    source: text("source").notNull().default("web"),
    sourceReference: text("source_reference"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    confidence: integer("confidence"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("opportunity_event_timeline_idx").on(
      table.opportunityId,
      table.occurredAt,
    ),
  ],
);

export const note = pgTable(
  "note",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunity.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    format: text("format").notNull().default("markdown"),
    ...timestamps,
  },
  (table) => [index("note_opportunity_idx").on(table.opportunityId)],
);

export const task = pgTable(
  "task",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunity.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("task_user_due_idx").on(table.userId, table.dueAt),
    index("task_opportunity_idx").on(table.opportunityId),
  ],
);
