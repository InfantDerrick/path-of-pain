import {
  getAttachmentDownload,
  OpportunityNotFoundError,
} from "@jobtracker/db";
import { sanitizeFilename } from "@jobtracker/storage";
import { jsonError, requireApiSession } from "@/lib/api";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; attachmentId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiSession();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { id, attachmentId } = await context.params;
    const file = await getAttachmentDownload(
      auth.session.user.id,
      id,
      attachmentId,
    );
    const filename = sanitizeFilename(file.filename);
    const body = file.body.buffer.slice(
      file.body.byteOffset,
      file.body.byteOffset + file.body.byteLength,
    ) as ArrayBuffer;
    return new Response(body, {
      headers: {
        "content-type": file.contentType,
        "content-length": String(file.size),
        "content-disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof OpportunityNotFoundError) {
      return jsonError("Attachment not found.", 404);
    }
    return jsonError("Could not download that attachment.");
  }
}
