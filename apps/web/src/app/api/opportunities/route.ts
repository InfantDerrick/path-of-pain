import {
  createOpportunity,
  DuplicateOpportunityError,
  enqueueOpportunityEnrichment,
  ensurePipelineStages,
  listOpportunities,
  markOpportunityEnrichmentFailed,
} from "@jobtracker/db";
import { createOpportunityInput } from "@jobtracker/domain";
import { jsonError, requireApiSession } from "@/lib/api";

export const dynamic = "force-dynamic";
const QUEUE_FAILURE_VERSION = "queue";

export async function GET() {
  const auth = await requireApiSession();
  if (!auth.ok) {
    return auth.response;
  }

  await ensurePipelineStages(auth.session.user.id);
  const opportunities = await listOpportunities(auth.session.user.id);
  return Response.json({ opportunities });
}

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be JSON.");
  }

  const parsed = createOpportunityInput.safeParse(body);
  if (!parsed.success) {
    return jsonError("Check the company, title, and optional URL.");
  }

  try {
    await ensurePipelineStages(auth.session.user.id);
    const created = await createOpportunity(auth.session.user.id, parsed.data);
    if (created.sourceUrl && parsed.data.autoEnrich !== false) {
      try {
        await enqueueOpportunityEnrichment({
          opportunityId: created.id,
          userId: auth.session.user.id,
        });
      } catch (error) {
        console.error("Failed to enqueue opportunity enrichment", error);
        await markOpportunityEnrichmentFailed({
          userId: auth.session.user.id,
          opportunityId: created.id,
          error:
            error instanceof Error
              ? error.message
              : "Could not queue enrichment.",
          parserVersion: QUEUE_FAILURE_VERSION,
        });
      }
    }
    return Response.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateOpportunityError) {
      return Response.json(
        { error: error.message, existingId: error.existingId },
        { status: 409 },
      );
    }
    return jsonError(
      error instanceof Error
        ? error.message
        : "Could not save this opportunity.",
    );
  }
}
