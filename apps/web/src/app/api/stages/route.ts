import { getAllStages, updatePipelineStages } from "@jobtracker/db";
import { stageSettingsInput } from "@jobtracker/domain";
import { jsonError, requireApiSession } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiSession();
  if (!auth.ok) {
    return auth.response;
  }

  return Response.json({ stages: await getAllStages(auth.session.user.id) });
}

export async function PATCH(request: Request) {
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

  const parsed = stageSettingsInput.safeParse(body);
  if (!parsed.success) {
    return jsonError("Check the stage list and try again.");
  }

  try {
    const stages = await updatePipelineStages(
      auth.session.user.id,
      parsed.data,
    );
    return Response.json({ stages });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not update stages.",
    );
  }
}
