import { getEnv } from "@jobtracker/shared/env";
import PgBoss from "pg-boss";

export const ENRICH_OPPORTUNITY_QUEUE = "enrich-opportunity";

let boss: PgBoss | undefined;
let started = false;
let queueReady = false;

export function getBoss() {
  if (!boss) {
    boss = new PgBoss({
      connectionString: getEnv().DATABASE_URL,
    });
  }
  return boss;
}

export async function startBoss() {
  const instance = getBoss();
  if (!started) {
    await instance.start();
    started = true;
  }
  if (!queueReady) {
    await instance.createQueue(ENRICH_OPPORTUNITY_QUEUE, {
      name: ENRICH_OPPORTUNITY_QUEUE,
      retryLimit: 2,
      retryDelay: 30,
    });
    queueReady = true;
  }
  return instance;
}

export async function enqueueOpportunityEnrichment(input: {
  opportunityId: string;
  userId: string;
}) {
  const instance = await startBoss();
  const jobId = await instance.send(ENRICH_OPPORTUNITY_QUEUE, input, {
    retryLimit: 2,
    retryDelay: 30,
    singletonKey: input.opportunityId,
  });
  if (!jobId) {
    throw new Error("pg-boss did not create an enrichment job.");
  }
}
