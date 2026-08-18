import { getSnapshotDownload, OpportunityNotFoundError } from "@jobtracker/db";
import { jsonError, requireApiSession } from "@/lib/api";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; snapshotId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiSession();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { id, snapshotId } = await context.params;
    const snapshot = await getSnapshotDownload(
      auth.session.user.id,
      id,
      snapshotId,
    );
    const body = snapshot.body.buffer.slice(
      snapshot.body.byteOffset,
      snapshot.body.byteOffset + snapshot.body.byteLength,
    ) as ArrayBuffer;
    return new Response(body, {
      headers: {
        "content-type": snapshot.contentType,
        "content-length": String(snapshot.size),
        "content-disposition": 'attachment; filename="posting-snapshot.html"',
      },
    });
  } catch (error) {
    if (error instanceof OpportunityNotFoundError) {
      return jsonError("Snapshot not found.", 404);
    }
    return jsonError("Could not download that snapshot.");
  }
}
