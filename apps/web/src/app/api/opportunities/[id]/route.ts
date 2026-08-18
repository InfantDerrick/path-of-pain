import {
  getOpportunityDetail,
  OpportunityNotFoundError,
  updateOpportunity,
} from "@jobtracker/db";
import { updateOpportunityInput } from "@jobtracker/domain";
import { jsonError, requireApiSession } from "@/lib/api";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiSession();
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const detail = await getOpportunityDetail(auth.session.user.id, id);
  if (!detail) {
    return jsonError("Opportunity not found.", 404);
  }
  return Response.json(detail);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiSession();
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be JSON.");
  }

  const parsed = updateOpportunityInput.safeParse(body);
  if (!parsed.success) {
    return jsonError("Check the edited fields and try again.");
  }

  try {
    const updated = await updateOpportunity(
      auth.session.user.id,
      id,
      parsed.data,
    );
    return Response.json(updated);
  } catch (error) {
    if (error instanceof OpportunityNotFoundError) {
      return jsonError("Opportunity not found.", 404);
    }
    return jsonError(
      error instanceof Error
        ? error.message
        : "Could not update this opportunity.",
    );
  }
}
