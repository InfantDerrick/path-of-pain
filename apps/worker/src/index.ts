import {
  ENRICH_OPPORTUNITY_QUEUE,
  enqueueOpportunityEnrichment,
  enrichOpportunityFromExtraction,
  getOpportunityDetail,
  listPendingEnrichmentTargets,
  markOpportunityEnrichmentFailed,
  markOpportunityEnrichmentRunning,
  startBoss,
} from "@jobtracker/db";
import { extractJobFromUrl, PARSER_VERSION } from "@jobtracker/job-parser";
import { APP_NAME, APP_VERSION } from "@jobtracker/shared";

type EnrichJob = {
  opportunityId: string;
  userId: string;
};

const boss = await startBoss();

await boss.work<EnrichJob>(ENRICH_OPPORTUNITY_QUEUE, async ([job]) => {
  if (!job) {
    return;
  }
  const payload = job.data;
  const detail = await getOpportunityDetail(
    payload.userId,
    payload.opportunityId,
  );
  if (!detail?.sourceUrl) {
    return;
  }

  try {
    await markOpportunityEnrichmentRunning(
      payload.userId,
      payload.opportunityId,
    );
    const extracted = await extractJobFromUrl(detail.sourceUrl);
    await enrichOpportunityFromExtraction({
      userId: payload.userId,
      opportunityId: payload.opportunityId,
      extracted,
      parserVersion: PARSER_VERSION,
    });
  } catch (error) {
    await markOpportunityEnrichmentFailed({
      userId: payload.userId,
      opportunityId: payload.opportunityId,
      error: error instanceof Error ? error.message : "Unknown parser error",
      parserVersion: PARSER_VERSION,
    });
    throw error;
  }
});

const pending = await listPendingEnrichmentTargets();
await Promise.all(
  pending.map((target) =>
    enqueueOpportunityEnrichment({
      opportunityId: target.opportunityId,
      userId: target.userId,
    }),
  ),
);

console.info(
  `${APP_NAME} worker ${APP_VERSION} listening for ${ENRICH_OPPORTUNITY_QUEUE}. Requeued ${pending.length} pending jobs.`,
);

await new Promise<void>((resolve) => {
  const shutdown = async () => {
    console.info("Worker shutting down.");
    await boss.stop({ graceful: true });
    resolve();
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
});
