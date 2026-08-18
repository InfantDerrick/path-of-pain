import {
  type CreateNoteInput,
  type CreateOpportunityInput,
  normalizeSourceUrl,
  type UpdateOpportunityInput,
} from "@jobtracker/domain";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../client";
import { createId } from "../ids";
import {
  company,
  jobPosting,
  note,
  opportunity,
  opportunityEvent,
  pipelineStage,
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

  const ownedCompany = await findOrCreateCompany(userId, input.companyName);
  const opportunityId = createId("opp");
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(opportunity).values({
      id: opportunityId,
      userId,
      companyId: ownedCompany.id,
      title: input.title,
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
      enrichmentStatus: "IDLE",
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
      stageId: pipelineStage.id,
      stageName: pipelineStage.name,
      stageSlug: pipelineStage.slug,
    })
    .from(opportunity)
    .innerJoin(company, eq(company.id, opportunity.companyId))
    .innerJoin(pipelineStage, eq(pipelineStage.id, opportunity.currentStageId))
    .where(eq(opportunity.userId, userId))
    .orderBy(desc(opportunity.lastActivityAt));
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

  const [notes, events] = await Promise.all([
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
  ]);

  return { ...row, notes, events };
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

  const now = new Date();

  await db
    .update(opportunity)
    .set({
      title: input.title ?? existing.title,
      companyId: nextCompany?.id ?? existing.companyId,
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
