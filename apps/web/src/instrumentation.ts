export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  if (process.env.SKIP_DB_MIGRATE === "true") {
    return;
  }
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  const { runMigrations } = await import("@jobtracker/db/migrate");
  await runMigrations();
}
