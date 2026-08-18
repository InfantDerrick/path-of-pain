import {
  type CreateInterviewInput,
  type CreateNoteInput,
  type CreateOpportunityInput,
  type CreateTaskInput,
  type MoveStageInput,
  normalizeSourceUrl,
  type UpdateOpportunityInput,
  type UpdateTaskInput,
} from "@jobtracker/domain";
import type { ExtractedJob } from "@jobtracker/job-parser";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "../client";
import {
  buildEnrichmentMerge,
  companyNameFromUrl,
  URL_ONLY_TITLE,
} from "../enrichment-merge";
import { createId } from "../ids";
import {
  company,
  interview,
  jobPosting,
  note,
  opportunity,
  opportunityEvent,
  pipelineStage,
  task,
} from "../schema/tracking";
import { getStageBySlug } from "./pipeline";

export class DuplicateOpportunityError extends Error {
  readonly code = "DUPLICATE_OPPORTUNITY" as const;
  constructor(readonly existingId: string) {
    super("An opportunity with this URL already exists.");
  }
}

function emptyToNull(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function faviconFromUrl(value: string | null) {
  if (!value) {
    return null;
  }
  try {
    const url = new URL(value);
    return new URL("/favicon.ico", url.origin).toString();
  } catch {
    return null;
  }
}

function shouldReplaceCompanyLogo(input: {
  existingLogoUrl: string | null;
  extractedLogoUrl: string | undefined;
  sourceUrl: string | null;
}) {
  if (!input.extractedLogoUrl) {
    return false;
  }
  if (!input.existingLogoUrl) {
    return true;
  }
  if (input.existingLogoUrl === faviconFromUrl(input.sourceUrl)) {
    return true;
  }
  try {
    const existing = new URL(input.existingLogoUrl);
    const source = input.sourceUrl ? new URL(input.sourceUrl) : null;
    const existingHostname = existing.hostname.replace(/^www\./, "");
    const sourceHostname = source?.hostname.replace(/^www\./, "");
    return (
      existingHostname === sourceHostname ||
      existingHostname === "store-images.s-microsoft.com"
    );
  } catch {
    return false;
  }
}

export class OpportunityNotFoundError extends Error {
  readonly code = "NOT_FOUND" as const;
  constructor() {
    super("Opportunity not found.");
  }
}

async function findOrCreateCompany(userId: string, name: string) {
  const normalized = name.trim();
  const [existing] = await db
    .select()
    .from(company)
    .where(
      and(
        eq(company.userId, userId),
        eq(company.nameNormalized, normalized.toLowerCase()),
      ),
    )
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(company)
    .values({
      id: createId("co"),
      userId,
      name: normalized,
      nameNormalized: normalized.toLowerCase(),
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create company.");
  }
  return created;
}

async function recordEvent(input: {
  opportunityId: string;
  userId: string;
  type: string;
  source: string;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(opportunityEvent).values({
    id: createId("evt"),
    opportunityId: input.opportunityId,
    userId: input.userId,
    type: input.type,
    source: input.source,
    metadata: input.metadata ?? {},
  });
}

function mappedStageEvent(slug: string, terminalType: string | null) {
  if (slug === "applied") {
    return "APPLICATION_SUBMITTED";
  }
  if (slug === "assessment") {
    return "OA_RECEIVED";
  }
  if (slug === "recruiter") {
    return "RECRUITER_CONTACTED";
  }
  if (slug === "offer") {
    return "OFFER_RECEIVED";
  }
  if (terminalType === "rejected") {
    return "REJECTED";
  }
  return null;
}

export async function createOpportunity(
  userId: string,
  input: CreateOpportunityInput,
) {
  const normalizedUrl = normalizeSourceUrl(input.sourceUrl);
  if (input.sourceUrl && !normalizedUrl) {
    throw new Error("Enter a valid http(s) job URL, or leave it blank.");
  }

  if (normalizedUrl) {
    const [duplicate] = await db
      .select({ id: opportunity.id })
      .from(opportunity)
      .where(
        and(
          eq(opportunity.userId, userId),
          eq(opportunity.normalizedSourceUrl, normalizedUrl),
        ),
      )
      .limit(1);
    if (duplicate) {
      throw new DuplicateOpportunityError(duplicate.id);
    }
  }

  const stageSlug = input.intent === "APPLY" ? "applied" : "saved";
  const stage = await getStageBySlug(userId, stageSlug);
  if (!stage) {
    throw new Error("Pipeline stages are not available for this user.");
  }

  const initialCompanyName =
    input.companyName ?? companyNameFromUrl(normalizedUrl);
  const initialTitle = input.title ?? URL_ONLY_TITLE;
  const ownedCompany = await findOrCreateCompany(userId, initialCompanyName);
  const opportunityId = createId("opp");
  const now = new Date();
  const shouldQueueEnrichment =
    Boolean(normalizedUrl) && input.autoEnrich !== false;

  await db.transaction(async (tx) => {
    await tx.insert(opportunity).values({
      id: opportunityId,
      userId,
      companyId: ownedCompany.id,
      title: initialTitle,
      sourceUrl: input.sourceUrl ?? null,
      normalizedSourceUrl: normalizedUrl,
      status: "ACTIVE",
      currentStageId: stage.id,
      captureSource: input.captureSource,
      location: input.location ?? null,
      workplaceType: input.workplaceType ?? "UNKNOWN",
      compensation: input.compensation ?? null,
      lastActivityAt: now,
    });

    await tx.insert(jobPosting).values({
      id: createId("post"),
      opportunityId,
      location: input.location ?? null,
      workplaceType: input.workplaceType ?? "UNKNOWN",
      enrichmentStatus: shouldQueueEnrichment ? "QUEUED" : "IDLE",
    });

    await tx.insert(opportunityEvent).values({
      id: createId("evt"),
      opportunityId,
      userId,
      type: "JOB_SAVED",
      source: input.captureSource,
      metadata: { intent: input.intent },
    });

    if (input.intent === "APPLY") {
      await tx.insert(opportunityEvent).values({
        id: createId("evt"),
        opportunityId,
        userId,
        type: "APPLICATION_SUBMITTED",
        source: input.captureSource,
        metadata: { stage: stage.slug },
      });
    }

    if (input.notes) {
      await tx.insert(note).values({
        id: createId("note"),
        opportunityId,
        userId,
        body: input.notes,
        format: "markdown",
      });
      await tx.insert(opportunityEvent).values({
        id: createId("evt"),
        opportunityId,
        userId,
        type: "NOTE_ADDED",
        source: input.captureSource,
      });
    }
  });

  const created = await getOpportunityDetail(userId, opportunityId);
  if (!created) {
    throw new Error("Saved the opportunity, but failed to load it back.");
  }
  return created;
}

export async function markOpportunityEnrichmentQueued(
  userId: string,
  opportunityId: string,
) {
  const existing = await getOpportunityDetail(userId, opportunityId);
  if (!existing) {
    throw new OpportunityNotFoundError();
  }
  if (!existing.sourceUrl) {
    throw new Error("This opportunity does not have a job URL to enrich.");
  }

  const now = new Date();
  await db
    .update(jobPosting)
    .set({
      enrichmentStatus: "QUEUED",
      enrichmentError: null,
      updatedAt: now,
    })
    .where(eq(jobPosting.opportunityId, opportunityId));
}

export async function markOpportunityEnrichmentRunning(
  userId: string,
  opportunityId: string,
) {
  const existing = await getOpportunityDetail(userId, opportunityId);
  if (!existing) {
    throw new OpportunityNotFoundError();
  }

  await db
    .update(jobPosting)
    .set({
      enrichmentStatus: "RUNNING",
      enrichmentError: null,
      updatedAt: new Date(),
    })
    .where(eq(jobPosting.opportunityId, opportunityId));
}

export async function listPendingEnrichmentTargets(limit = 50) {
  return db
    .select({
      opportunityId: opportunity.id,
      userId: opportunity.userId,
    })
    .from(opportunity)
    .innerJoin(jobPosting, eq(jobPosting.opportunityId, opportunity.id))
    .where(
      and(
        inArray(jobPosting.enrichmentStatus, ["QUEUED", "RUNNING"]),
        eq(opportunity.status, "ACTIVE"),
      ),
    )
    .limit(limit);
}

export async function enrichOpportunityFromExtraction(input: {
  userId: string;
  opportunityId: string;
  extracted: ExtractedJob;
  parserVersion: string;
}) {
  const existing = await getOpportunityDetail(
    input.userId,
    input.opportunityId,
  );
  if (!existing) {
    throw new OpportunityNotFoundError();
  }

  const now = new Date();
  const extracted = input.extracted;
  const merged = buildEnrichmentMerge(existing, extracted);
  const nextCompany =
    merged.companyName !== existing.companyName
      ? await findOrCreateCompany(input.userId, merged.companyName)
      : null;
  const companyId = nextCompany?.id ?? existing.companyId;
  const canReplaceLogo = shouldReplaceCompanyLogo({
    existingLogoUrl: existing.companyLogoUrl,
    extractedLogoUrl: extracted.companyLogoUrl,
    sourceUrl: existing.sourceUrl,
  });
  const logoUrl = canReplaceLogo
    ? extracted.companyLogoUrl
    : (existing.companyLogoUrl ?? faviconFromUrl(existing.sourceUrl));

  await db.transaction(async (tx) => {
    await tx
      .update(opportunity)
      .set({
        title: merged.title,
        companyId,
        location: merged.location,
        workplaceType: merged.workplaceType,
        compensation: merged.compensation,
        lastActivityAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(opportunity.id, input.opportunityId),
          eq(opportunity.userId, input.userId),
        ),
      );

    if (logoUrl && (!existing.companyLogoUrl || canReplaceLogo)) {
      await tx
        .update(company)
        .set({ logoUrl, updatedAt: now })
        .where(eq(company.id, companyId));
    }

    await tx
      .update(jobPosting)
      .set({
        location: existing.location ?? extracted.location ?? null,
        workplaceType: extracted.workplaceType ?? existing.workplaceType,
        salaryMin: extracted.salaryMin ?? null,
        salaryMax: extracted.salaryMax ?? null,
        salaryCurrency: extracted.salaryCurrency ?? null,
        descriptionHtml: extracted.descriptionHtml ?? null,
        descriptionText: merged.descriptionText,
        externalJobId: extracted.externalJobId ?? null,
        employmentType: extracted.employmentType ?? null,
        sourceType: extracted.method ?? null,
        enrichmentStatus: "SUCCEEDED",
        enrichmentError: null,
        parserVersion: input.parserVersion,
        parserMethod: extracted.method ?? null,
        updatedAt: now,
      })
      .where(eq(jobPosting.opportunityId, input.opportunityId));

    await tx.insert(opportunityEvent).values({
      id: createId("evt"),
      opportunityId: input.opportunityId,
      userId: input.userId,
      type: "JOB_ENRICHED",
      source: "worker",
      sourceReference: existing.sourceUrl,
      metadata: {
        method: extracted.method,
        parserVersion: input.parserVersion,
        confidence: extracted.confidence,
      },
    });
  });
}

export async function markOpportunityEnrichmentFailed(input: {
  userId: string;
  opportunityId: string;
  error: string;
  parserVersion: string;
}) {
  const existing = await getOpportunityDetail(
    input.userId,
    input.opportunityId,
  );
  if (!existing) {
    throw new OpportunityNotFoundError();
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(jobPosting)
      .set({
        enrichmentStatus: "FAILED",
        enrichmentError: input.error.slice(0, 500),
        parserVersion: input.parserVersion,
        updatedAt: now,
      })
      .where(eq(jobPosting.opportunityId, input.opportunityId));

    await tx.insert(opportunityEvent).values({
      id: createId("evt"),
      opportunityId: input.opportunityId,
      userId: input.userId,
      type: "JOB_ENRICHMENT_FAILED",
      source: "worker",
      sourceReference: existing.sourceUrl,
      metadata: {
        error: input.error.slice(0, 500),
        parserVersion: input.parserVersion,
      },
    });
  });
}

export async function listOpportunities(userId: string) {
  return db
    .select({
      id: opportunity.id,
      title: opportunity.title,
      status: opportunity.status,
      location: opportunity.location,
      workplaceType: opportunity.workplaceType,
      compensation: opportunity.compensation,
      sourceUrl: opportunity.sourceUrl,
      lastActivityAt: opportunity.lastActivityAt,
      createdAt: opportunity.createdAt,
      companyName: company.name,
      companyLogoUrl: company.logoUrl,
      stageId: pipelineStage.id,
      stageName: pipelineStage.name,
      stageSlug: pipelineStage.slug,
    })
    .from(opportunity)
    .innerJoin(company, eq(company.id, opportunity.companyId))
    .innerJoin(pipelineStage, eq(pipelineStage.id, opportunity.currentStageId))
    .where(
      and(eq(opportunity.userId, userId), ne(opportunity.status, "WITHDRAWN")),
    )
    .orderBy(desc(opportunity.lastActivityAt));
}

export async function discardOpportunity(
  userId: string,
  opportunityId: string,
) {
  const existing = await getOpportunityDetail(userId, opportunityId);
  if (!existing) {
    throw new OpportunityNotFoundError();
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(opportunity)
      .set({
        status: "WITHDRAWN",
        normalizedSourceUrl: null,
        lastActivityAt: now,
        updatedAt: now,
      })
      .where(
        and(eq(opportunity.id, opportunityId), eq(opportunity.userId, userId)),
      );

    await tx.insert(opportunityEvent).values({
      id: createId("evt"),
      opportunityId,
      userId,
      type: "WITHDRAWN",
      source: "web",
      metadata: { reason: "discarded" },
    });
  });
}

export async function getOpportunityDetail(
  userId: string,
  opportunityId: string,
) {
  const [row] = await db
    .select({
      id: opportunity.id,
      title: opportunity.title,
      status: opportunity.status,
      location: opportunity.location,
      workplaceType: opportunity.workplaceType,
      compensation: opportunity.compensation,
      sourceUrl: opportunity.sourceUrl,
      captureSource: opportunity.captureSource,
      lastActivityAt: opportunity.lastActivityAt,
      createdAt: opportunity.createdAt,
      updatedAt: opportunity.updatedAt,
      companyId: company.id,
      companyName: company.name,
      companyLogoUrl: company.logoUrl,
      stageId: pipelineStage.id,
      stageName: pipelineStage.name,
      stageSlug: pipelineStage.slug,
      postingId: jobPosting.id,
      descriptionText: jobPosting.descriptionText,
      enrichmentStatus: jobPosting.enrichmentStatus,
      enrichmentError: jobPosting.enrichmentError,
    })
    .from(opportunity)
    .innerJoin(company, eq(company.id, opportunity.companyId))
    .innerJoin(pipelineStage, eq(pipelineStage.id, opportunity.currentStageId))
    .leftJoin(jobPosting, eq(jobPosting.opportunityId, opportunity.id))
    .where(
      and(eq(opportunity.id, opportunityId), eq(opportunity.userId, userId)),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  const [notes, events, tasks, interviews] = await Promise.all([
    db
      .select()
      .from(note)
      .where(eq(note.opportunityId, opportunityId))
      .orderBy(desc(note.updatedAt)),
    db
      .select()
      .from(opportunityEvent)
      .where(eq(opportunityEvent.opportunityId, opportunityId))
      .orderBy(desc(opportunityEvent.occurredAt)),
    db
      .select()
      .from(task)
      .where(eq(task.opportunityId, opportunityId))
      .orderBy(desc(task.createdAt)),
    db
      .select()
      .from(interview)
      .where(eq(interview.opportunityId, opportunityId))
      .orderBy(desc(interview.scheduledAt)),
  ]);

  return { ...row, notes, events, tasks, interviews };
}

export async function moveOpportunityStage(
  userId: string,
  opportunityId: string,
  input: MoveStageInput,
) {
  const existing = await getOpportunityDetail(userId, opportunityId);
  if (!existing) {
    throw new OpportunityNotFoundError();
  }

  const [nextStage] = await db
    .select()
    .from(pipelineStage)
    .where(
      and(
        eq(pipelineStage.id, input.stageId),
        eq(pipelineStage.userId, userId),
      ),
    )
    .limit(1);
  if (!nextStage) {
    throw new Error("Stage not found.");
  }
  if (nextStage.id === existing.stageId) {
    return existing;
  }

  const now = new Date();
  const mapped = mappedStageEvent(nextStage.slug, nextStage.terminalType);
  await db.transaction(async (tx) => {
    await tx
      .update(opportunity)
      .set({
        currentStageId: nextStage.id,
        status: nextStage.terminalType
          ? nextStage.terminalType.toUpperCase()
          : "ACTIVE",
        lastActivityAt: now,
        updatedAt: now,
      })
      .where(
        and(eq(opportunity.id, opportunityId), eq(opportunity.userId, userId)),
      );

    const metadata = {
      fromStageId: existing.stageId,
      fromStageName: existing.stageName,
      toStageId: nextStage.id,
      toStageName: nextStage.name,
      toStageSlug: nextStage.slug,
    };
    await tx.insert(opportunityEvent).values({
      id: createId("evt"),
      opportunityId,
      userId,
      type: "STAGE_CHANGED",
      source: "web",
      metadata,
    });
    if (mapped) {
      await tx.insert(opportunityEvent).values({
        id: createId("evt"),
        opportunityId,
        userId,
        type: mapped,
        source: "web",
        metadata,
      });
    }
  });

  return getOpportunityDetail(userId, opportunityId);
}

export async function updateOpportunity(
  userId: string,
  opportunityId: string,
  input: UpdateOpportunityInput,
) {
  const existing = await getOpportunityDetail(userId, opportunityId);
  if (!existing) {
    throw new OpportunityNotFoundError();
  }

  const nextUrl =
    input.sourceUrl === undefined
      ? existing.sourceUrl
      : emptyToNull(input.sourceUrl);
  const nextLocation =
    input.location === undefined
      ? existing.location
      : emptyToNull(input.location);
  const nextCompensation =
    input.compensation === undefined
      ? existing.compensation
      : emptyToNull(input.compensation);
  const nextDescription =
    input.descriptionText === undefined
      ? existing.descriptionText
      : emptyToNull(input.descriptionText);
  const nextCompanyLogoUrl =
    input.companyLogoUrl === undefined
      ? existing.companyLogoUrl
      : emptyToNull(input.companyLogoUrl);
  const normalizedUrl = normalizeSourceUrl(nextUrl);
  if (nextUrl && !normalizedUrl) {
    throw new Error("Enter a valid http(s) job URL, or leave it blank.");
  }

  if (normalizedUrl) {
    const [duplicate] = await db
      .select({ id: opportunity.id })
      .from(opportunity)
      .where(
        and(
          eq(opportunity.userId, userId),
          eq(opportunity.normalizedSourceUrl, normalizedUrl),
        ),
      )
      .limit(1);
    if (duplicate && duplicate.id !== opportunityId) {
      throw new DuplicateOpportunityError(duplicate.id);
    }
  }

  const nextCompany =
    input.companyName && input.companyName !== existing.companyName
      ? await findOrCreateCompany(userId, input.companyName)
      : null;
  const nextCompanyId = nextCompany?.id ?? existing.companyId;

  const now = new Date();

  await db
    .update(opportunity)
    .set({
      title: input.title ?? existing.title,
      companyId: nextCompanyId,
      location: nextLocation,
      sourceUrl: nextUrl,
      normalizedSourceUrl: normalizedUrl,
      workplaceType: input.workplaceType ?? existing.workplaceType,
      compensation: nextCompensation,
      lastActivityAt: now,
      updatedAt: now,
    })
    .where(
      and(eq(opportunity.id, opportunityId), eq(opportunity.userId, userId)),
    );

  await db
    .update(company)
    .set({ logoUrl: nextCompanyLogoUrl, updatedAt: now })
    .where(eq(company.id, nextCompanyId));

  if (existing.postingId) {
    await db
      .update(jobPosting)
      .set({
        descriptionText: nextDescription,
        location: nextLocation,
        workplaceType: input.workplaceType ?? existing.workplaceType,
        updatedAt: now,
      })
      .where(eq(jobPosting.id, existing.postingId));
  }

  return getOpportunityDetail(userId, opportunityId);
}

export async function addNote(
  userId: string,
  opportunityId: string,
  input: CreateNoteInput,
) {
  const existing = await getOpportunityDetail(userId, opportunityId);
  if (!existing) {
    throw new OpportunityNotFoundError();
  }

  const now = new Date();
  await db.insert(note).values({
    id: createId("note"),
    opportunityId,
    userId,
    body: input.body,
    format: "markdown",
  });
  await recordEvent({
    opportunityId,
    userId,
    type: "NOTE_ADDED",
    source: "web",
  });
  await db
    .update(opportunity)
    .set({ lastActivityAt: now, updatedAt: now })
    .where(eq(opportunity.id, opportunityId));

  return getOpportunityDetail(userId, opportunityId);
}

export async function addTask(
  userId: string,
  opportunityId: string,
  input: CreateTaskInput,
) {
  const existing = await getOpportunityDetail(userId, opportunityId);
  if (!existing) {
    throw new OpportunityNotFoundError();
  }
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(task).values({
      id: createId("tsk"),
      opportunityId,
      userId,
      title: input.title,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
    });
    await tx.insert(opportunityEvent).values({
      id: createId("evt"),
      opportunityId,
      userId,
      type: "TASK_ADDED",
      source: "web",
      metadata: { title: input.title, dueAt: input.dueAt ?? null },
    });
    await tx
      .update(opportunity)
      .set({ lastActivityAt: now, updatedAt: now })
      .where(eq(opportunity.id, opportunityId));
  });
  return getOpportunityDetail(userId, opportunityId);
}

export async function updateTask(
  userId: string,
  opportunityId: string,
  taskId: string,
  input: UpdateTaskInput,
) {
  const existing = await getOpportunityDetail(userId, opportunityId);
  if (!existing) {
    throw new OpportunityNotFoundError();
  }
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(task)
      .set({
        completedAt: input.completed ? now : null,
        updatedAt: now,
      })
      .where(
        and(
          eq(task.id, taskId),
          eq(task.userId, userId),
          eq(task.opportunityId, opportunityId),
        ),
      );
    await tx.insert(opportunityEvent).values({
      id: createId("evt"),
      opportunityId,
      userId,
      type: input.completed ? "TASK_COMPLETED" : "TASK_REOPENED",
      source: "web",
      metadata: { taskId },
    });
  });
  return getOpportunityDetail(userId, opportunityId);
}

export async function addInterview(
  userId: string,
  opportunityId: string,
  input: CreateInterviewInput,
) {
  const existing = await getOpportunityDetail(userId, opportunityId);
  if (!existing) {
    throw new OpportunityNotFoundError();
  }
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(interview).values({
      id: createId("int"),
      opportunityId,
      userId,
      scheduledAt: new Date(input.scheduledAt),
      type: input.type,
      round: input.round ?? null,
      interviewer: input.interviewer ?? null,
      meetingUrl: input.meetingUrl ?? null,
      notes: input.notes ?? null,
    });
    await tx.insert(opportunityEvent).values({
      id: createId("evt"),
      opportunityId,
      userId,
      type: "INTERVIEW_SCHEDULED",
      source: "web",
      metadata: {
        scheduledAt: input.scheduledAt,
        type: input.type,
        round: input.round ?? null,
        interviewer: input.interviewer ?? null,
      },
    });
    await tx
      .update(opportunity)
      .set({ lastActivityAt: now, updatedAt: now })
      .where(eq(opportunity.id, opportunityId));
  });
  return getOpportunityDetail(userId, opportunityId);
}
