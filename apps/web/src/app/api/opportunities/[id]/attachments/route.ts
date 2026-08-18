import { addAttachment, OpportunityNotFoundError } from "@jobtracker/db";
import { createAttachmentMetadataInput } from "@jobtracker/domain";
import { jsonError, requireApiSession } from "@/lib/api";

export const dynamic = "force-dynamic";

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireApiSession();
  if (!auth.ok) {
    return auth.response;
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Upload must use form data.");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonError("Choose a file to attach.");
  }
  if (file.size <= 0) {
    return jsonError("That file is empty.");
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return jsonError("Keep uploads under 8 MB.");
  }

  const parsed = createAttachmentMetadataInput.safeParse({
    kind: formData.get("kind") || "other",
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return jsonError("Check the attachment type.");
  }

  try {
    const { id } = await context.params;
    const body = new Uint8Array(await file.arrayBuffer());
    const updated = await addAttachment({
      userId: auth.session.user.id,
      opportunityId: id,
      file: body,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      metadata: parsed.data,
    });
    return Response.json(updated, { status: 201 });
  } catch (error) {
    if (error instanceof OpportunityNotFoundError) {
      return jsonError("Opportunity not found.", 404);
    }
    return jsonError(
      error instanceof Error ? error.message : "Could not attach that file.",
    );
  }
}
