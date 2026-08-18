import { db, user } from "@jobtracker/db";
import { getEnv } from "@jobtracker/shared/env";
import { count } from "drizzle-orm";

export type RegistrationMode = "true" | "false" | "auto";

export async function isRegistrationOpen(mode = getEnv().REGISTRATION_ENABLED) {
  if (mode === "true") {
    return true;
  }
  if (mode === "false") {
    return false;
  }

  const [row] = await db.select({ total: count() }).from(user);
  return (row?.total ?? 0) === 0;
}
