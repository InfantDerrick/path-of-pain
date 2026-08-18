import { getDashboard } from "@jobtracker/db";
import { requireApiSession } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiSession();
  if (!auth.ok) {
    return auth.response;
  }

  return Response.json(await getDashboard(auth.session.user.id));
}
