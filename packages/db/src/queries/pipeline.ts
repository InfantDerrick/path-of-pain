import type { StageSettingsInput } from "@jobtracker/domain";
import { defaultPipelineStages } from "@jobtracker/domain";
import { eq } from "drizzle-orm";
import { db } from "../client";
import { createId } from "../ids";
import { pipelineStage } from "../schema/tracking";

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "stage"
  );
}

function uniqueSlug(base: string, existing: Set<string>) {
  let slug = base;
  let index = 2;
  while (existing.has(slug)) {
    slug = `${base}-${index}`;
    index += 1;
  }
  existing.add(slug);
  return slug;
}

export async function ensurePipelineStages(userId: string) {
  const existing = await db
    .select()
    .from(pipelineStage)
    .where(eq(pipelineStage.userId, userId));

  if (existing.length > 0) {
    return existing;
  }

  const values = defaultPipelineStages.map((stage) => ({
    id: createId("stg"),
    userId,
    name: stage.name,
    slug: stage.slug,
    orderIndex: stage.order,
    terminalType: stage.terminalType,
    hidden: Boolean(stage.hiddenByDefault),
  }));

  return db.insert(pipelineStage).values(values).returning();
}

export async function getVisibleStages(userId: string) {
  const stages = await ensurePipelineStages(userId);
  return stages
    .filter((stage) => !stage.hidden)
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

export async function getAllStages(userId: string) {
  const stages = await ensurePipelineStages(userId);
  return stages.sort((a, b) => a.orderIndex - b.orderIndex);
}

export async function getStageBySlug(userId: string, slug: string) {
  const stages = await ensurePipelineStages(userId);
  return stages.find((stage) => stage.slug === slug) ?? stages[0] ?? null;
}

export async function updatePipelineStages(
  userId: string,
  input: StageSettingsInput,
) {
  await ensurePipelineStages(userId);
  const owned = await getAllStages(userId);
  const ownedIds = new Set(owned.map((stage) => stage.id));
  if (input.stages.some((stage) => stage.id && !ownedIds.has(stage.id))) {
    throw new Error("One or more stages do not belong to this user.");
  }
  const slugs = new Set(owned.map((stage) => stage.slug));

  await db.transaction(async (tx) => {
    for (const stage of owned) {
      await tx
        .update(pipelineStage)
        .set({ orderIndex: stage.orderIndex + 10_000 })
        .where(eq(pipelineStage.id, stage.id));
    }

    for (const stage of input.stages) {
      if (stage.id) {
        await tx
          .update(pipelineStage)
          .set({
            name: stage.name,
            orderIndex: stage.orderIndex,
            hidden: stage.hidden,
            updatedAt: new Date(),
          })
          .where(eq(pipelineStage.id, stage.id));
      } else {
        await tx.insert(pipelineStage).values({
          id: createId("stg"),
          userId,
          name: stage.name,
          slug: uniqueSlug(slugify(stage.name), slugs),
          orderIndex: stage.orderIndex,
          terminalType: null,
          hidden: stage.hidden,
        });
      }
    }
  });

  return getAllStages(userId);
}
