import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getEnv } from "@jobtracker/shared/env";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

function resolveMigrationsFolder() {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.env.MIGRATIONS_FOLDER,
    resolve(here, "../drizzle"),
    resolve(process.cwd(), "packages/db/drizzle"),
    resolve(process.cwd(), "drizzle"),
  ].filter((value): value is string => Boolean(value));

  for (const folder of candidates) {
    if (existsSync(resolve(folder, "meta"))) {
      return folder;
    }
  }

  throw new Error(
    `Could not find Drizzle migrations folder. Looked in: ${candidates.join(", ")}`,
  );
}

export async function runMigrations(databaseUrl = getEnv().DATABASE_URL) {
  const sql = postgres(databaseUrl, { max: 1 });
  const db = drizzle(sql);
  const migrationsFolder = resolveMigrationsFolder();

  await migrate(db, { migrationsFolder });
  await sql.end({ timeout: 5 });
}

const invokedDirectly = process.argv[1]
  ? fileURLToPath(import.meta.url) === resolve(process.argv[1])
  : false;

if (invokedDirectly) {
  runMigrations()
    .then(() => {
      console.log("Database migrations applied.");
    })
    .catch((error: unknown) => {
      console.error("Database migration failed.", error);
      process.exit(1);
    });
}
