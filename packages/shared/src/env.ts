import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1),
  APP_URL: z.url(),
  AUTH_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().min(32).optional(),
  REGISTRATION_ENABLED: z.enum(["true", "false", "auto"]).default("auto"),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_PATH: z.string().default("./data"),
  AI_PROVIDER: z
    .enum(["disabled", "ollama", "openai-compatible"])
    .default("disabled"),
  OLLAMA_BASE_URL: z.string().optional(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  SKIP_ENV_VALIDATION: z.enum(["true", "false"]).optional(),
  SKIP_DB_MIGRATE: z.enum(["true", "false"]).optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

function loadEnvFiles() {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  for (const relativePath of [
    ".env",
    ".env.local",
    "../../.env",
    "../../.env.local",
  ]) {
    loadDotenv({
      path: resolve(process.cwd(), relativePath),
      override: false,
      quiet: true,
    });
  }
}

const buildPlaceholders: Env = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://jobtracker:jobtracker@localhost:5432/jobtracker",
  APP_URL: "http://localhost:3000",
  AUTH_SECRET: "x".repeat(32),
  ENCRYPTION_KEY: undefined,
  REGISTRATION_ENABLED: "auto",
  STORAGE_DRIVER: "local",
  STORAGE_PATH: "./data",
  AI_PROVIDER: "disabled",
  OLLAMA_BASE_URL: undefined,
  LOG_LEVEL: "info",
  SKIP_ENV_VALIDATION: "true",
  SKIP_DB_MIGRATE: "true",
};

export function getEnv(): Env {
  if (cached) {
    return cached;
  }

  loadEnvFiles();

  const skip =
    process.env.SKIP_ENV_VALIDATION === "true" ||
    process.env.NEXT_PHASE === "phase-production-build";

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    if (skip) {
      cached = envSchema.parse({
        ...buildPlaceholders,
        DATABASE_URL:
          process.env.DATABASE_URL ?? buildPlaceholders.DATABASE_URL,
        APP_URL: process.env.APP_URL ?? buildPlaceholders.APP_URL,
        AUTH_SECRET:
          process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32
            ? process.env.AUTH_SECRET
            : buildPlaceholders.AUTH_SECRET,
      });
      return cached;
    }

    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }

  cached = parsed.data;
  return cached;
}

export function resetEnvCache() {
  cached = undefined;
}

export { envSchema };
