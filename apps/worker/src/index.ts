import {
  createEmailSuggestionsFromMessages,
  ENRICH_OPPORTUNITY_QUEUE,
  enqueueEmailConnectionSync,
  enqueueOpportunityEnrichment,
  enrichOpportunityFromExtraction,
  getEmailConnectionSyncTarget,
  getOpportunityDetail,
  listActiveEmailConnectionsForSync,
  listPendingEnrichmentTargets,
  markEmailConnectionSyncFailed,
  markEmailConnectionSyncStarted,
  markEmailConnectionSyncSucceeded,
  markOpportunityEnrichmentFailed,
  markOpportunityEnrichmentRunning,
  SYNC_EMAIL_CONNECTION_QUEUE,
  startBoss,
} from "@jobtracker/db";
import { fetchRecentImapMessages } from "@jobtracker/email";
import { extractJobFromUrl, PARSER_VERSION } from "@jobtracker/job-parser";
import { APP_NAME, APP_VERSION } from "@jobtracker/shared";

type EnrichJob = {
  opportunityId: string;
  userId: string;
};

type EmailSyncJob = {
  connectionId: string;
  userId: string;
};

const boss = await startBoss();
const EMAIL_SYNC_INTERVAL_MS = 15 * 60 * 1000;

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

await boss.work<EmailSyncJob>(SYNC_EMAIL_CONNECTION_QUEUE, async ([job]) => {
  if (!job) {
    return;
  }
  const payload = job.data;
  const target = await getEmailConnectionSyncTarget(payload);
  if (!target) {
    return;
  }

  try {
    await markEmailConnectionSyncStarted(payload);
    const since = new Date(
      Date.now() - target.syncWindowDays * 24 * 60 * 60 * 1000,
    );
    const messages = await fetchRecentImapMessages(target.config, since);
    await createEmailSuggestionsFromMessages({
      userId: payload.userId,
      connectionId: payload.connectionId,
      messages,
    });
    await markEmailConnectionSyncSucceeded(payload);
  } catch (error) {
    await markEmailConnectionSyncFailed({
      ...payload,
      error:
        error instanceof Error ? error.message : "Unknown email sync error",
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
const emailConnections = await listActiveEmailConnectionsForSync();
await Promise.all(
  emailConnections.map((target) => enqueueEmailConnectionSync(target)),
);

const emailSyncInterval = setInterval(async () => {
  try {
    const targets = await listActiveEmailConnectionsForSync();
    await Promise.all(
      targets.map((target) => enqueueEmailConnectionSync(target)),
    );
  } catch (error) {
    console.error("Failed to queue email sync sweep", error);
  }
}, EMAIL_SYNC_INTERVAL_MS);

console.info(
  `${APP_NAME} worker ${APP_VERSION} listening for ${ENRICH_OPPORTUNITY_QUEUE} and ${SYNC_EMAIL_CONNECTION_QUEUE}. Requeued ${pending.length} pending jobs and ${emailConnections.length} email syncs.`,
);

await new Promise<void>((resolve) => {
  const shutdown = async () => {
    console.info("Worker shutting down.");
    clearInterval(emailSyncInterval);
    await boss.stop({ graceful: true });
    resolve();
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
});
