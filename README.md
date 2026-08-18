# Path of Pain

Open-source, self-hosted, privacy-first job-search CRM. The hiring process is painful enough — keep the record on your machine.

This is **Phase 1**: sign in, create a role by hand, edit it, and see it on desktop and mobile. Remaining work is in [docs/remaining-phases.md](./docs/remaining-phases.md).

## Requirements

- Node.js 22+
- [pnpm](https://pnpm.io/) 11
- Docker and Docker Compose (canonical install), or Podman
- PostgreSQL 16 (provided by Compose)

## Quick start (Docker)

```bash
cp .env.example .env
# Replace AUTH_SECRET with `openssl rand -base64 32`
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). The first account is created on this instance (`REGISTRATION_ENABLED=auto`). After that, registration closes unless you set it to `true`.

## Local development

```bash
cp .env.example .env
docker compose up -d db
pnpm install
pnpm db:migrate
pnpm dev
```

The web app is at [http://localhost:3000](http://localhost:3000). The worker process is a placeholder until Phase 2 (URL enrichment).

## Useful scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Turborepo-driven web + worker watch |
| `pnpm lint` / `pnpm format` | Biome |
| `pnpm typecheck` | TypeScript across workspaces |
| `pnpm test` | Vitest unit tests |
| `pnpm --filter @jobtracker/web test:e2e` | Playwright (login page) |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Apply migrations |

## Layout

```text
apps/web         Next.js UI, PWA-to-be, HTTP API
apps/worker      Background consumers (Phase 2)
apps/extension   Browser extension (Phase 6)
packages/db      Drizzle schema and migrations
packages/domain  Entities, defaults, validation
packages/auth    Auth policy and Better Auth options
packages/ui      Shared UI helpers
packages/*       Parser, email, storage interfaces
infra/docker     Production Dockerfile
```

## Privacy

Path of Pain does not phone home. There is no product analytics, crash-report SaaS, or project-hosted proxy. Your browser talks to your instance.

## License

[MIT](./LICENSE)
