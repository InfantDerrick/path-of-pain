import { sql } from "@jobtracker/db";
import { APP_NAME, APP_VERSION } from "@jobtracker/shared";

export const dynamic = "force-dynamic";

export async function GET() {
  let database: "ok" | "error" = "ok";

  try {
    await sql`select 1`;
  } catch {
    database = "error";
  }

  const healthy = database === "ok";

  return Response.json(
    {
      status: healthy ? "ok" : "degraded",
      service: APP_NAME,
      version: APP_VERSION,
      checks: { database },
    },
    { status: healthy ? 200 : 503 },
  );
}
