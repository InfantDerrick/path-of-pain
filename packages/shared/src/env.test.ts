import { describe, expect, it } from "vitest";
import { envSchema, getEnv, resetEnvCache } from "./env";

const validEnv = {
  DATABASE_URL: "postgresql://jobtracker:jobtracker@localhost:5432/jobtracker",
  APP_URL: "http://localhost:3000",
  AUTH_SECRET: "dev-only-secret-do-not-use-prod1",
};

describe("envSchema", () => {
  it("accepts a valid local development configuration", () => {
    const parsed = envSchema.parse(validEnv);
    expect(parsed.REGISTRATION_ENABLED).toBe("auto");
    expect(parsed.AI_PROVIDER).toBe("disabled");
    expect(parsed.STORAGE_DRIVER).toBe("local");
  });

  it("rejects a short AUTH_SECRET", () => {
    const parsed = envSchema.safeParse({
      ...validEnv,
      AUTH_SECRET: "short",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a non-URL APP_URL", () => {
    const parsed = envSchema.safeParse({
      ...validEnv,
      APP_URL: "not-a-url",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("getEnv", () => {
  it("returns cached placeholders when validation is skipped", () => {
    const previous = { ...process.env };
    resetEnvCache();
    process.env.SKIP_ENV_VALIDATION = "true";
    delete process.env.DATABASE_URL;
    delete process.env.APP_URL;
    delete process.env.AUTH_SECRET;

    const env = getEnv();
    expect(env.DATABASE_URL).toContain("postgresql://");
    expect(env.APP_URL).toBe("http://localhost:3000");

    resetEnvCache();
    process.env = previous;
  });
});
