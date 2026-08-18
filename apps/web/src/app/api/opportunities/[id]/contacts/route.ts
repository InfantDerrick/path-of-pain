import {
  addOpportunityContact,
  OpportunityNotFoundError,
} from "@jobtracker/db";
import { createContactInput } from "@jobtracker/domain";
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

  const parsed = createContactInput.safeParse(body);
  if (!parsed.success) {
    return jsonError("Check the contact details.");
  }

  try {
    const { id } = await context.params;
    const updated = await addOpportunityContact(
      auth.session.user.id,
      id,
      parsed.data,
    );
    return Response.json(updated, { status: 201 });
  } catch (error) {
    if (error instanceof OpportunityNotFoundError) {
      return jsonError("Opportunity not found.", 404);
    }
    return jsonError(
      error instanceof Error ? error.message : "Could not save that contact.",
    );
  }
}
