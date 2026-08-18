import {
  enqueueOpportunityEnrichment,
  markOpportunityEnrichmentFailed,
  markOpportunityEnrichmentQueued,
  OpportunityNotFoundError,
} from "@jobtracker/db";
import { jsonError, requireApiSession } from "@/lib/api";

export const dynamic = "force-dynamic";
const QUEUE_FAILURE_VERSION = "queue";

type RouteContext = { params: Promise<{ id: string }> };

const attempts = new Map<string, number>();
const WINDOW_MS = 60_000;

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireApiSession();
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const key = `${auth.session.user.id}:${id}`;
  const now = Date.now();
  const last = attempts.get(key) ?? 0;
  if (now - last < WINDOW_MS) {
    return jsonError("Wait a minute before reprocessing this URL again.", 429);
  }
  attempts.set(key, now);

  try {
    await markOpportunityEnrichmentQueued(auth.session.user.id, id);
    try {
      await enqueueOpportunityEnrichment({
        opportunityId: id,
        userId: auth.session.user.id,
      });
    } catch (error) {
      await markOpportunityEnrichmentFailed({
        userId: auth.session.user.id,
        opportunityId: id,
        error:
          error instanceof Error
            ? error.message
            : "Could not queue enrichment.",
        parserVersion: QUEUE_FAILURE_VERSION,
      });
      throw error;
    }
    return Response.json({ ok: true });
  } catch (error) {
    attempts.delete(key);
    if (error instanceof OpportunityNotFoundError) {
      return jsonError("Opportunity not found.", 404);
    }
    return jsonError(
      error instanceof Error
        ? error.message
        : "Could not queue enrichment for this opportunity.",
    );
  }
}
