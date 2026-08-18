import { resolveEmailSuggestion } from "@jobtracker/db";
import { jsonError, requireApiSession } from "@/lib/api";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireApiSession();
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const resolved = await resolveEmailSuggestion({
    userId: auth.session.user.id,
    suggestionId: id,
    status: "wrong_job",
  });
  if (!resolved) {
    return jsonError("Suggestion not found.", 404);
  }

  return Response.json({ ok: true });
}
