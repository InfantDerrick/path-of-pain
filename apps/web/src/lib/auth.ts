import { createAuthOptions } from "@jobtracker/auth";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

const options = createAuthOptions();

export const auth = betterAuth({
  ...options,
  plugins: [...(options.plugins ?? []), nextCookies()],
});
