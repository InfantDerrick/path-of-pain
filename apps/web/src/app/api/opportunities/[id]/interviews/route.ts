import { addInterview, OpportunityNotFoundError } from "@jobtracker/db";
import { createInterviewInput } from "@jobtracker/domain";
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

  const parsed = createInterviewInput.safeParse(body);
  if (!parsed.success) {
    return jsonError("Check the interview details.");
  }

  try {
    const { id } = await context.params;
    return Response.json(
      await addInterview(auth.session.user.id, id, parsed.data),
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof OpportunityNotFoundError) {
      return jsonError("Opportunity not found.", 404);
    }
    return jsonError(
      error instanceof Error ? error.message : "Could not add that interview.",
    );
  }
}
