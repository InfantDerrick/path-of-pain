import { getEnv } from "@jobtracker/shared/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

type Db = ReturnType<typeof createDb>;

const globalForDb = globalThis as unknown as {
  postgres?: ReturnType<typeof postgres>;
  db?: Db;
};

function createClient() {
  const env = getEnv();
  return postgres(env.DATABASE_URL, {
    max: env.NODE_ENV === "production" ? 10 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

function createDb(client: ReturnType<typeof postgres>) {
  return drizzle(client, { schema });
}

export const sql = globalForDb.postgres ?? createClient();
export const db = globalForDb.db ?? createDb(sql);

if (process.env.NODE_ENV !== "production") {
  globalForDb.postgres = sql;
  globalForDb.db = db;
}

export type Database = typeof db;
export { schema };
