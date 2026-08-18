import { getEnv } from "@jobtracker/shared/env";
import PgBoss from "pg-boss";

export const ENRICH_OPPORTUNITY_QUEUE = "enrich-opportunity";
export const SYNC_EMAIL_CONNECTION_QUEUE = "sync-email-connection";

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
    await instance.createQueue(SYNC_EMAIL_CONNECTION_QUEUE, {
      name: SYNC_EMAIL_CONNECTION_QUEUE,
      retryLimit: 2,
      retryDelay: 60,
    });
    queueReady = true;
  }
  return instance;
}

export async function enqueueEmailConnectionSync(input: {
  connectionId: string;
  userId: string;
}) {
  const instance = await startBoss();
  const jobId = await instance.send(SYNC_EMAIL_CONNECTION_QUEUE, input, {
    retryLimit: 2,
    retryDelay: 60,
    singletonKey: input.connectionId,
  });
  if (!jobId) {
    throw new Error("pg-boss did not create an email sync job.");
  }
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
