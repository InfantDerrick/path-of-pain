import { moveOpportunityStage, OpportunityNotFoundError } from "@jobtracker/db";
import { moveStageInput } from "@jobtracker/domain";
import { jsonError, requireApiSession } from "@/lib/api";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
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

  const parsed = moveStageInput.safeParse(body);
  if (!parsed.success) {
    return jsonError("Choose a valid stage.");
  }

  try {
    const { id } = await context.params;
    const detail = await moveOpportunityStage(
      auth.session.user.id,
      id,
      parsed.data,
    );
    return Response.json(detail);
  } catch (error) {
    if (error instanceof OpportunityNotFoundError) {
      return jsonError("Opportunity not found.", 404);
    }
    return jsonError(
      error instanceof Error ? error.message : "Could not move this role.",
    );
  }
}
