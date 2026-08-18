import { db, ensurePipelineStages, schema } from "@jobtracker/db";
import { APP_NAME } from "@jobtracker/shared";
import { getEnv } from "@jobtracker/shared/env";
import type { BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { isRegistrationOpen } from "./registration";

export function createAuthOptions(): BetterAuthOptions {
  const env = getEnv();

  return {
    appName: APP_NAME,
    baseURL: env.APP_URL,
    secret: env.AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: env.REGISTRATION_ENABLED === "false",
      minPasswordLength: 8,
      requireEmailVerification: false,
    },
    user: {
      additionalFields: {
        locale: {
          type: "string",
          required: false,
          defaultValue: "en",
          input: true,
        },
        timezone: {
          type: "string",
          required: false,
          input: true,
        },
      },
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 20,
    },
    trustedOrigins: [env.APP_URL],
    telemetry: {
      enabled: false,
    },
    databaseHooks: {
      user: {
        create: {
          after: async (createdUser) => {
            await ensurePipelineStages(createdUser.id);
          },
        },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-up/email") {
          return;
        }
        const open = await isRegistrationOpen();
        if (!open) {
          throw new APIError("FORBIDDEN", {
            message: "Registration is disabled on this instance.",
          });
        }
      }),
    },
    advanced: {
      useSecureCookies: env.NODE_ENV === "production",
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      },
    },
  };
}
