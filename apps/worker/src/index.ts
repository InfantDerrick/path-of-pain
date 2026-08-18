import { APP_NAME, APP_VERSION } from "@jobtracker/shared";

console.info(
  `${APP_NAME} worker ${APP_VERSION} started. Queue consumers land in Phase 2.`,
);

await new Promise<void>((resolve) => {
  const shutdown = () => {
    console.info("Worker shutting down.");
    resolve();
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
});
