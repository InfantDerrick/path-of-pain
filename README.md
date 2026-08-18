# Path of Pain

Open-source, self-hosted, privacy-first job-search CRM. The hiring process is painful enough - keep the record on your machine.

Path of Pain can capture job posts, enrich role metadata, track the hiring trail, and watch IMAP mailboxes for deterministic job-search signals. Remaining work is in [docs/remaining-phases.md](./docs/remaining-phases.md).

## Requirements

- Node.js 22+
- [pnpm](https://pnpm.io/) 11
- Docker and Docker Compose (canonical install), or Podman
- PostgreSQL 16 (provided by Compose)

## Quick start (Docker)

```bash
cp .env.example .env
# Replace AUTH_SECRET and ENCRYPTION_KEY with `openssl rand -base64 32`
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

The web app is at [http://localhost:3000](http://localhost:3000). The worker handles URL enrichment and email sync jobs.

## Email setup

Path of Pain supports IMAP mailboxes from **Settings -> Email signals**. Email sync is deterministic: the worker fetches recent messages, extracts job-search assertions, stores only message refs/metadata/suggestions, and discards the parsed email body before writing to Postgres.

Before configuring email:

- Set a stable `ENCRYPTION_KEY` in `.env` so mailbox credentials can be encrypted at rest.
- Use an app password when your provider supports it. Do not paste your primary email password unless your provider explicitly requires that for IMAP.
- Keep SSL/TLS enabled and port `993` unless your provider says otherwise.

Common provider notes:

- **Gmail:** use host `imap.gmail.com`, port `993`, SSL/TLS on. Google says personal Gmail IMAP is always on as of January 2025, and if sign-in fails with username/password auth, users with 2-Step Verification can try an app password. See [Google's Gmail client setup guide](https://support.google.com/mail/answer/7126229?hl=en) and [Google Workspace IMAP/app-password guidance](https://support.google.com/a/answer/9003945?hl=en-na).
- **iCloud Mail:** use host `imap.mail.me.com`, port `993`, SSL/TLS on, with an iCloud app-specific password.
- **Fastmail:** use host `imap.fastmail.com`, port `993`, SSL/TLS on, with an app password.
- **Outlook.com / Microsoft 365:** Microsoft lists `outlook.office365.com`, port `993`, SSL/TLS, but also says Outlook.com IMAP uses OAuth2/Modern Auth. The current Path of Pain IMAP connector is password/app-password based, so Microsoft accounts may need a future OAuth connector. See [Microsoft's Outlook IMAP settings](https://support.microsoft.com/en-us/outlook/pop-imap-and-smtp-settings-for-outlook-com).

After saving a mailbox, Path of Pain tests the connection, queues a sync immediately, and the worker refreshes active connections every 15 minutes.

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
apps/worker      Background consumers for enrichment and email sync
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
