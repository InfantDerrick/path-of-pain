import { OpportunityNotFoundError, updateTask } from "@jobtracker/db";
import { updateTaskInput } from "@jobtracker/domain";
import { jsonError, requireApiSession } from "@/lib/api";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; taskId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
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

  const parsed = updateTaskInput.safeParse(body);
  if (!parsed.success) {
    return jsonError("Check the task state.");
  }

  try {
    const { id, taskId } = await context.params;
    return Response.json(
      await updateTask(auth.session.user.id, id, taskId, parsed.data),
    );
  } catch (error) {
    if (error instanceof OpportunityNotFoundError) {
      return jsonError("Opportunity not found.", 404);
    }
    return jsonError(
      error instanceof Error ? error.message : "Could not update that task.",
    );
  }
}
