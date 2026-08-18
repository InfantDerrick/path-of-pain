import { defaultPipelineStages } from "@jobtracker/domain";
import { eq } from "drizzle-orm";
import { db } from "../client";
import { createId } from "../ids";
import { pipelineStage } from "../schema/tracking";

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

export async function getStageBySlug(userId: string, slug: string) {
  const stages = await ensurePipelineStages(userId);
  return stages.find((stage) => stage.slug === slug) ?? stages[0] ?? null;
}
