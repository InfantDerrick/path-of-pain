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
  parserVersion: text("parser_version"),
  parserMethod: text("parser_method"),
  ...timestamps,
});

export const postingSnapshot = pgTable(
  "posting_snapshot",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunity.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    hash: text("hash").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...timestamps,
  },
  (table) => [
    index("posting_snapshot_opportunity_idx").on(table.opportunityId),
    index("posting_snapshot_user_captured_idx").on(
      table.userId,
      table.capturedAt,
    ),
  ],
);

export const contact = pgTable(
  "contact",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role"),
    email: text("email"),
    phone: text("phone"),
    url: text("url"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("contact_user_company_idx").on(table.userId, table.companyId),
    uniqueIndex("contact_user_company_email_uidx")
      .on(table.userId, table.companyId, table.email)
      .where(sql`${table.email} is not null`),
  ],
);

export const opportunityContact = pgTable(
  "opportunity_contact",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunity.id, { onDelete: "cascade" }),
    contactId: text("contact_id")
      .notNull()
      .references(() => contact.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    relationship: text("relationship"),
    ...timestamps,
  },
  (table) => [
    index("opportunity_contact_opportunity_idx").on(table.opportunityId),
    uniqueIndex("opportunity_contact_pair_uidx").on(
      table.opportunityId,
      table.contactId,
    ),
  ],
);

export const attachment = pgTable(
  "attachment",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunity.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    kind: text("kind").notNull().default("other"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("attachment_opportunity_idx").on(table.opportunityId),
    index("attachment_user_created_idx").on(table.userId, table.createdAt),
  ],
);

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

export const emailConnection = pgTable(
  "email_connection",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    label: text("label").notNull(),
    encryptedConfig: text("encrypted_config"),
    status: text("status").notNull().default("active"),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastError: text("last_error"),
    syncWindowDays: integer("sync_window_days").notNull().default(30),
    storeSubject: boolean("store_subject").notNull().default(true),
    storeSnippets: boolean("store_snippets").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index("email_connection_user_idx").on(table.userId),
    index("email_connection_user_status_idx").on(table.userId, table.status),
  ],
);

export const emailMessageRef = pgTable(
  "email_message_ref",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    connectionId: text("connection_id")
      .notNull()
      .references(() => emailConnection.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerMessageId: text("provider_message_id").notNull(),
    threadId: text("thread_id"),
    fromEmail: text("from_email"),
    fromDomain: text("from_domain"),
    subject: text("subject"),
    subjectHash: text("subject_hash").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("email_message_ref_provider_message_uidx").on(
      table.userId,
      table.provider,
      table.providerMessageId,
    ),
    index("email_message_ref_user_received_idx").on(
      table.userId,
      table.receivedAt,
    ),
    index("email_message_ref_user_domain_idx").on(
      table.userId,
      table.fromDomain,
    ),
  ],
);

export const emailSuggestion = pgTable(
  "email_suggestion",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    messageRefId: text("message_ref_id")
      .notNull()
      .references(() => emailMessageRef.id, { onDelete: "cascade" }),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunity.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    confidence: integer("confidence").notNull(),
    status: text("status").notNull().default("pending"),
    summary: text("summary").notNull(),
    evidence: jsonb("evidence").$type<string[]>().notNull().default([]),
    matchReasons: jsonb("match_reasons")
      .$type<string[]>()
      .notNull()
      .default([]),
    proposedEvent: jsonb("proposed_event")
      .$type<Record<string, unknown>>()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("email_suggestion_user_status_idx").on(table.userId, table.status),
    index("email_suggestion_opportunity_idx").on(table.opportunityId),
    uniqueIndex("email_suggestion_message_type_uidx").on(
      table.messageRefId,
      table.type,
      table.opportunityId,
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

export const interview = pgTable(
  "interview",
  {
    id: text("id").primaryKey(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunity.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    type: text("type").notNull().default("interview"),
    round: text("round"),
    interviewer: text("interviewer"),
    meetingUrl: text("meeting_url"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("interview_user_scheduled_idx").on(table.userId, table.scheduledAt),
    index("interview_opportunity_idx").on(table.opportunityId),
  ],
);
