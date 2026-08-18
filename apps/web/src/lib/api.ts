import { getSession } from "@/lib/session";

export async function requireApiSession() {
  const session = await getSession();
  if (!session) {
    return {
      ok: false as const,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true as const, session };
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
