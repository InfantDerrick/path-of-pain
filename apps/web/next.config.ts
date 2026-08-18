import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: projectRoot,
  serverExternalPackages: ["postgres"],
  transpilePackages: [
    "@jobtracker/auth",
    "@jobtracker/db",
    "@jobtracker/shared",
    "@jobtracker/storage",
    "@jobtracker/ui",
    "@jobtracker/domain",
    "@jobtracker/email",
  ],
};

export default nextConfig;
