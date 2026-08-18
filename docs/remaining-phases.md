# Remaining phases

Path of Pain ships in vertical slices. **Phase 0** (repo, Docker, login) and **Phase 1** (manual opportunity CRUD) are done. Work the remaining phases in order. Each one should leave a usable product; do not build weeks of infrastructure before the next user flow works end to end.

Product name is **Path of Pain**. Paper/rust theme, light and dark. MIT license. No telemetry, no maintainer-operated backend, no mandatory cloud AI.

## Already shipped

| Phase | What exists today |
| --- | --- |
| 0 | pnpm/Turborepo monorepo, Biome, Vitest, Playwright config, CI, Compose + Dockerfile, `/api/health`, Better Auth login, registration `auto`/`true`/`false` |
| 1 | Drizzle schema for user, company, opportunity, posting, stages, events, notes, tasks; default pipeline seed; manual create/list/detail/edit; notes; timeline of system events; mobile list + desktop sidebar |

Useful starting points:

- Create/list/detail APIs: `apps/web/src/app/api/opportunities/`
- Queries: `packages/db/src/queries/opportunities.ts`, `packages/db/src/queries/pipeline.ts`
- Parser stub: `packages/job-parser/src/types.ts`
- Worker stub: `apps/worker/src/index.ts`
- Storage stub: `packages/storage/src/index.ts`
- Email stub: `packages/email/src/index.ts`
- Extension stub: `apps/extension/src/index.ts`

## Guardrails (every phase)

- PostgreSQL is the only required infrastructure. Queue with pg-boss, not Redis. Search with Postgres FTS, not Elasticsearch.
- No project-operated APIs, telemetry, or hosted proxies.
- Core flows work with `AI_PROVIDER=disabled`.
- Fetching arbitrary URLs requires SSRF protections (block private/link-local/localhost, unsafe schemes, tight timeouts, body/redirect limits).
- Never silently overwrite user-edited fields with parser output.
- Minimize retained data. Do not store email bodies or files just because they are available.
- Every feature needs loading/empty/error states, a 375px layout, a privacy pass, and tests.
- Prefer typed domain/db operations over UI mutating tables.
- A feature is not done until a fresh self-hosted instance can use it.

---

## Phase 2 — URL capture and asynchronous enrichment

**Goal:** Paste a job URL, get a visible opportunity immediately, then watch title/company/location/description fill in.

**Starting point:** `POST /api/opportunities` already accepts `sourceUrl` and dedupes on `normalized_source_url`. `job_posting.enrichment_status` is `IDLE`. The worker process is a no-op. Parser types exist but there are no adapters.

### Build

1. Wire **pg-boss** against `DATABASE_URL`. Enqueue `enrich-opportunity` from create (and from `POST /api/opportunities/:id/reprocess`).
2. Turn `apps/worker` into a consumer that shares `@jobtracker/db` and `@jobtracker/job-parser`.
3. Extraction pipeline, in order:
   1. Normalize/validate URL (reuse `normalizeSourceUrl`)
   2. Known ATS adapter if `matches(url)`
   3. schema.org `JobPosting` / JSON-LD
   4. Static HTML + Cheerio
   5. Playwright fallback for JS-rendered pages
   6. Normalize fields, merge into opportunity **without** clobbering user-edited values
   7. Emit `JOB_ENRICHED` or `JOB_ENRICHMENT_FAILED`
4. First adapters: Greenhouse, Lever, Ashby, plus generic JSON-LD/HTML.
5. Show enrichment status and error on the detail page. Poll or refresh; no websocket required.
6. Global URL field in the desktop header and as the primary mobile Add action. Manual create stays.

### Non-scope

Snapshots (Phase 4). Playwright should run in the worker, not the web request. Do not fetch from the user's browser.

### Security

SSRF on every server-side fetch. Timeouts, redirect cap, content-type and size limits. Rate-limit reprocess. Store parser version and method for debugging.

### Tests

URL normalization, merge-respects-user-edits, fixture HTML/JSON for Greenhouse/Lever/Ashby and malformed JSON-LD. Do not hit live career sites in CI.

### Done when

Pasting a common Greenhouse/Lever/Ashby URL creates a row in under two seconds and fields populate asynchronously.

---

## Phase 3 — Pipeline, timeline, notes, tasks

**Goal:** Represent a multi-round process without losing history.

**Starting point:** Stages are seeded and stored per user. Detail shows stage name and a raw event list. Notes are append-only with a submit button. Tasks table exists but has no UI. Inbox is a stub. There is no stage-change API.

### Build

1. `POST /api/opportunities/:id/stage` — move stage, write immutable `STAGE_CHANGED` (and mapped events like `APPLICATION_SUBMITTED` / `REJECTED` when appropriate). Status (`ACTIVE` vs terminal) stays separate from stage.
2. Desktop **Kanban** with drag-and-drop; list view on desktop and **default on mobile**.
3. User-configurable stages: rename, reorder, hide, add. Do not hard-code business logic on stage names.
4. Timeline component: chronological, actor/source, metadata, touch-friendly. Editing an event changes descriptive metadata; history stays auditable.
5. Structured **interviews** (date/time, type, round, interviewer, meeting URL) and **tasks** (due, complete, quick templates: follow up, prepare OA, thank-you).
6. Notes **autosave**.
7. Needs Attention inbox: overdue tasks, upcoming interviews, failed enrichment, unconfirmed email suggestions (empty until Phase 7).
8. `GET /api/dashboard` for those counters.

### Non-scope

Board filters/bulk archive can be minimal. Web Push is Phase 5+.

### Done when

A candidate can be moved Saved → Applied → OA → Recruiter → Technical → Onsite → Offer without losing a single transition, on phone and desktop.

---

## Phase 4 — Snapshots, contacts, attachments

**Goal:** The opportunity remains a complete record if the posting disappears.

**Starting point:** `packages/storage` is an interface only. No snapshot/contact/attachment tables yet (add them here). Posting description is a user-pasted text field.

### Build

1. Local filesystem adapter (`STORAGE_PATH`, default `/data` in Compose). Optional S3-compatible adapter behind the same interface.
2. Snapshot table: `opportunity_id`, `storage_key`, `captured_at`, `hash`. Capture during enrichment when legally/technically appropriate.
3. Contacts reusable per company: name, role, email, phone, URL, notes. `opportunity_contact` join with relationship.
4. Attachments: resume used, recruiter docs, offer docs. Sanitize filename, cap size, store metadata + blob. Download by id.
5. APIs: `POST /api/opportunities/:id/contacts`, `POST /api/opportunities/:id/attachments`, snapshot access from detail.
6. Detail page sections for posting (normalized + original snapshot), contacts, files.

### Non-scope

No outbound email. No OCR.

### Security

Filename/content-type sanitization, size limits, no secrets in logs, attachments not world-readable.

### Done when

You can open a role after the source URL 404s and still see description, snapshot, contacts, and files.

---

## Phase 5 — PWA and mobile installability

**Goal:** Install to a phone home screen; core tracking is comfortable one-handed.

**Starting point:** Responsive list/detail and bottom nav exist. No manifest, icons, or service worker. No clipboard paste shortcut.

### Build

1. Web app manifest, icons, standalone display, theme/background (`#efe6d8` light / `#161310` dark, accent rust).
2. Service worker for app-shell/static assets only. **Do not cache API responses** that contain job-search data.
3. Offline shell + read-only fallback for recently visited non-sensitive metadata only if it can be done safely.
4. Sticky bottom actions on detail: Add Note, Update Stage, Add Event.
5. Paste-from-clipboard on Add where the browser allows it.
6. Playwright E2E at 375px and 390px: save → (enrich if Phase 2) → stage → note → task.

### Non-scope

Native iOS/Android apps. Web Push can wait until installability is stable. Web Share Target is a follow-up, not a blocker.

### Done when

Over HTTPS the app installs to the home screen and every core flow works at 375px without horizontal scroll.

---

## Phase 6 — Browser extension

**Goal:** Save the current job page to the user's instance in two clicks.

**Starting point:** `apps/extension` is a placeholder. Capture APIs exist from Phases 1–2.

### Build

1. Initialize WXT + React + TypeScript in `apps/extension`. Chromium and Firefox first.
2. Settings: instance base URL + revocable scoped API token created in Path of Pain (Settings). Token limited to capture/read-minimal routes.
3. Actions: **Save** and **I Applied**. POST directly to the user's `APP_URL`. Never through a project server.
4. Optional safe DOM metadata (title/company) as a hint; server enrichment remains source of truth.
5. Connection test. No browsing-history collection, no background telemetry.

### Non-scope

Safari until Chromium/Firefox packaging is solid. The product must work without the extension.

### Done when

Chrome or Firefox can save the current job to a running instance in two clicks, and the token can be revoked from Settings.

---

## Phase 7 — Email connectors and suggestions

**Goal:** A rejection or interview email can be matched and **proposed**, not silently applied.

**Starting point:** `packages/email` is a stub. `ENCRYPTION_KEY` is already in env. Inbox is ready to host suggestions.

### Build

1. `email_connection` (encrypted credentials/tokens at rest with instance `ENCRYPTION_KEY`) and `email_message_ref` (minimal metadata, unique on user/provider/message id).
2. Connectors behind one interface: **IMAP** and **Gmail API**. Microsoft Graph later. No Gmail DOM scraping.
3. Sync pipeline: new message → normalize headers + selected body text → match opportunity (sender/domain, company, title tokens, thread ids) → deterministic classifier → optional AI only if enabled.
4. Suggestions Inbox: Confirm / Ignore. High confidence still configurable; medium needs confirm; low stays inbox-only.
5. Classifier rules (testable, locale-aware): application received, OA/assessment, interview request, rejected, offer. Do not claim certainty from subject line alone.
6. Disconnect + delete synced email metadata. Full body retention off by default.

### Non-scope

Silent low-confidence status mutations. Maintainer-operated inbound mailbox. Outlook in v1.

### Done when

Connecting IMAP or Gmail (user-owned OAuth app) can propose a rejection or interview against the right opportunity, and Confirm writes the event.

---

## Phase 8 — Search, analytics, import/export

**Goal:** Find history, understand outcomes, and leave with every byte.

**Starting point:** List is recency-only. No FTS. No analytics page. No import/export.

### Build

1. Postgres full-text search over title, company, description, notes, contacts.
2. List filters: stage/status, company, location, source, dates, active/closed. Persist filter prefs locally.
3. Analytics from events only: saved/applied/active/interviews/offers/closed; funnel; response/interview rates; source breakdown; time in stage / time to first response. Date range. No third-party analytics.
4. CSV import for historical applications.
5. Export: JSON (opportunities, pipeline, events, notes, contacts, tasks, settings refs, manifest version), CSV for opportunities/events, attachments ZIP.
6. `GET /api/export`. Document the schema so migrations stay honest.

### Non-scope

Elasticsearch. Vector search.

### Done when

A user can search, read a funnel, and export JSON/CSV/files that another instance could theoretically ingest.

---

## Phase 9 — Deployment hardening

**Goal:** A non-contributor can deploy on their own cloud or VPS from the docs.

**Starting point:** Dev Compose (app + Postgres) and a production Dockerfile exist. Worker is not in Compose. No Railway/Coolify guides, backup docs, or GHCR release flow.

### Build

1. Production Compose: `app`, `worker`, `postgres`, volumes for `/data` and Postgres, healthchecks, migrations on start, documented secrets (`DATABASE_URL`, `APP_URL`, `AUTH_SECRET`, `ENCRYPTION_KEY`).
2. Same image, different command for worker (`pnpm worker:start`).
3. Railway template/guide (user's account, user's billing). Coolify Compose guide. Plain Compose remains canonical.
4. Backup/restore for Postgres and attachment volume. Pre-upgrade backup note. Instance version in Settings.
5. Publish images to GHCR with semver + immutable git SHA tags. Changelog for schema-breaking changes.
6. Honest cost notes (Playwright/worker are not free). If the project website dies, instances keep running.

### Non-scope

Kubernetes/Helm until Compose is excellent. Do not claim zero-cost hosting.

### Done when

A clean Docker Compose install (app + worker + Postgres) comes up, migrates, and serves Path of Pain on a documented URL.

---

## Phase 10 — Optional local AI

**Goal:** AI may help ambiguous extraction and email classification. Turning it off changes nothing essential.

**Starting point:** `AI_PROVIDER=disabled` is already the env default.

### Build

1. Provider interface: `disabled` | `ollama` | `openai-compatible`. Ollama first (`OLLAMA_BASE_URL`).
2. Call AI only after deterministic parser/classifier logic, for ambiguous cases (extraction, email class, company normalization, note summaries).
3. Settings: enable/disable, model name, no hidden calls. Log provider/model used on assisted events, never prompt contents that include email bodies in default logs.
4. Tests that core create/stage/export paths work with AI disabled.

### Non-scope

Embeddings/vector DB. Mandatory cloud keys. AI-authored status transitions the user cannot see or revert.

### Done when

Disabling AI leaves capture, tracking, export, and email confirm/ignore intact.

---

## Suggested API surface still to add

Existing: opportunities CRUD, notes create, auth, health.

| Method | Route | Phase |
| --- | --- | --- |
| POST | `/api/opportunities/:id/reprocess` | 2 |
| POST | `/api/opportunities/:id/stage` | 3 |
| POST | `/api/opportunities/:id/events` | 3 |
| POST | `/api/opportunities/:id/tasks` | 3 |
| GET | `/api/dashboard` | 3 |
| POST | `/api/opportunities/:id/contacts` | 4 |
| POST | `/api/opportunities/:id/attachments` | 4 |
| POST | `/api/email/connections` | 7 |
| POST | `/api/email/suggestions/:id/confirm` | 7 |
| POST | `/api/email/suggestions/:id/ignore` | 7 |
| GET | `/api/export` | 8 |

Create-with-URL response should grow `enrichmentStatus: "QUEUED"` in Phase 2.

## v1 acceptance (all phases)

A pasted URL creates a visible opportunity immediately; enrichment is async. Users configure stages, transition roles, and see full event history. Notes, contacts, tasks/interviews, posting data, and attachments live on one record. Core flows work at 375px; PWA installs over HTTPS. Extension talks only to the user's instance. Gmail/IMAP never require maintainer infrastructure; detections need confirmation. No mandatory telemetry. Fresh Compose deploy is app + worker + Postgres. JSON/CSV/attachment export works. SSRF, auth rate limits, encrypted connector secrets, safe uploads, secret-free logs.
