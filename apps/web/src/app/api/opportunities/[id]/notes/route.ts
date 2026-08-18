import { addNote, OpportunityNotFoundError } from "@jobtracker/db";
import { createNoteInput } from "@jobtracker/domain";
import { jsonError, requireApiSession } from "@/lib/api";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
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

  const parsed = createNoteInput.safeParse(body);
  if (!parsed.success) {
    return jsonError("A note needs some text.");
  }

  try {
    const updated = await addNote(auth.session.user.id, id, parsed.data);
    return Response.json(updated, { status: 201 });
  } catch (error) {
    if (error instanceof OpportunityNotFoundError) {
      return jsonError("Opportunity not found.", 404);
    }
    return jsonError("Could not save that note.");
  }
}
