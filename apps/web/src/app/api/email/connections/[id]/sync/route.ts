import { enqueueEmailConnectionSync } from "@jobtracker/db";
import { jsonError, requireApiSession } from "@/lib/api";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession();
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  try {
    await enqueueEmailConnectionSync({
      userId: auth.session.user.id,
      connectionId: id,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not queue email sync.",
    );
  }
}
