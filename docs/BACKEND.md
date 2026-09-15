# Backend Documentation

## Runtime

- Entry: `server.ts` (thin bootstrap) → `server/app.ts:createApp()` → `server/app.ts:startServer()`, production bundle `dist/server.cjs` via esbuild (`package.json:9`).
- Scripts: `dev: tsx server.ts`, `build: vite build + esbuild`, `start: node dist/server.cjs`, `lint: tsc --noEmit`, `test: vitest run`.
- JSON uses a Base64 transport limit slightly above 20 MiB to carry a 15 MiB decoded upload (`server/middleware/security.ts`). Security headers + strict CORS allowlist are applied on every request.
- Dev logger skips static/Vite noise, logs `/api` method→status→user (`server/middleware/security.ts`).

## Auth

- Better Auth is the sole application identity provider (`server/middleware/auth.ts`). Session resolved per request; Supabase Auth bearer JWTs are not accepted by the protected API. Supabase remains the database/storage provider.
- `req.user`, `resolvedProfileId`, `userRole` attached after profile lookup by ID then email.
- `Roles` = Admin, Industry/Partner, Researcher, Student, Investor (`server/middleware/auth.ts`). IP layer additionally accepts `TTO`, `TTO/IP`, `IP Office`, `Super Admin` role strings from `profiles.role` (`server/ip/ipAuthz.ts:1`).
- Browser never holds service keys. `getServiceClient()` is server-only (`server/db/supabase.ts`); `getDbClientForRequest()` prefers caller token, falls back to service client (`server/middleware/auth.ts`).

## Middleware

- `validateBody(schema)` (`server/middleware/validate.ts`): Zod `safeParse`, strips unknown fields, `400` on failure.
- `requireRole(...roles)` (`server/middleware/auth.ts`): exact role match, `403` otherwise.
- `throttleLimit(max, windowMs)` (`server/middleware/rateLimit.ts`): per-process in-memory counters keyed by endpoint plus user ID (or IP before authentication), with a 10,000-key cap and 10-minute eviction. This is not a shared/distributed production limiter.
- `authenticateUser` before all protected routes; Better Auth handler mounted before JSON parsing (`server/middleware/security.ts`).

## Module layout (scalable)

- `server.ts` — thin bootstrap (was ~3,652 lines, now ~9 lines).
- `server/app.ts` — `createApp()` composes middleware + all domain routes; `startServer()` handles Vite/static + listen. Covered by `server/app.test.ts`.
- `server/config/env.ts` — PORT, CORS allowlist, Supabase/API key validators.
- `server/db/supabase.ts` — `getSupabaseClient`, `getServiceClient`, `serviceClientConfigError`.
- `server/middleware/security.ts` — dev logger, security headers, CORS, Better Auth mount, JSON limits.
- `server/middleware/auth.ts` — `authenticateUser`, `requireRole`, `Roles`, mutable-field sets, `getRequestProfileId`, `getDbClientForRequest`, `normalizeEmbedding`.
- `server/middleware/rateLimit.ts` — shared `InMemoryRateLimiter` + `throttleLimit`.
- `server/middleware/validate.ts` — Zod `validateBody`.
- `server/services/aiGateway.ts` — Gemini/Groq clients, fallback models, `generateWithProviders`, assistant reviewer, `recordAiDecision`, UG sources + fallback news.
- `server/services/sourceVerification.ts` — `verifySourceEvidenceUrl`, `verifyNewsSourceEvidence` with trusted-host list. Covered by `server/services/sourceVerification.test.ts`.
- `server/routes/health.ts` — `GET /api/health`.
- `server/routes/profiles.ts` — `GET /api/profile/me`, `GET /api/profile/:id`, `POST /api/profile/update`.
- `server/routes/news.ts` — `GET /api/news`, `GET /api/news/last-sync`, `POST/DELETE /api/admin/news`, `GET /api/admin/verify`.
- `server/routes/ip.ts` — all `/api/ip/*` disclosure, findings, files, links, audit, access-request, TTO, publication routes + `GET /api/admin/overview`.
- `server/routes/storage.ts` — `POST /api/storage/upload`, `POST /api/storage/sign`, `GET /api/projects/:id/technical-brief`.
- `server/routes/projects.ts` — `/api/projects/*` + `/api/bookmarks/*`.
- `server/routes/eois.ts` — all `/api/eois/*`.
- `server/routes/ai.ts` — `/api/translate`, `/api/gemini/*`, `/api/ai-profile`, `/api/admin/extract-document`, `/api/ai-decisions`.
- `server/routes/scout.ts` — `POST /api/ai-scout/sync`, `POST /api/ai-match`.
- `server/routes/challenges.ts` — all `/api/industry-challenges/*`, all `/api/challenge-matches/*`.
- `server/routes/matching.ts` — `POST /api/matches`.
- `server/routes/admin.ts` — `GET /api/admin/overview`.
- `server/ip/ipAuthz.ts` — `isAdminRole`, `isTtoRole`, `isSuperAdminRole`, `canViewDisclosure`, `canAdminReview`, `canTtoReview`, `canDecidePublication`.
- `server/ip/ipService.ts` — `applyTransition({ db, disclosureId, actorId, actorRole, action, patch, eventAction, eventDetails })`, UUID check, `missingTables` (`42P01`), optimistic `version` guard.
- `server/ip/ipAudit.ts` — `writeIpEvent`, append-only, returns `{ ok, error }` without throwing.
- `server/ip/ipAi.ts` — `buildAdvisoryFindings({ title, description, answers, route })`; rule-based authenticity/confidentiality/ownership/evidence/quality signals; always human-review.
- `server/ip/ipEvidence.ts` — bounded evidence collector for researcher links, UG news, OpenAlex, Crossref, Google Patents, WIPO PATENTSCOPE, and IP portal references; assigns citation IDs and formats the evidence packet.
- `lib/ipWorkflow.ts:38` — canonical transition table; `transitionIpWorkflow` throws on illegal move.
- `lib/requestSchemas.ts:91` — all IP Zod bodies/queries with size caps.
- `lib/aiSchemas.ts:1` — AI JSON extraction + validation (`extractJson`, `parseAIJson`).
- `lib/authorization.ts:1` — legacy release/match guards, untouched.
- `lib/uploadGuard.ts` — storage validation reused by `/api/storage/upload`.

## Data model

Phase 1 (`docs/database/ip_disclosure_phase1.sql:1`):
- `ip_disclosures`: one row per project (`one_disclosure_per_project`), `status` CHECK, `route`, `answers JSONB`, policy versions + timestamps, `tto_opt_out` consistent with route, `version`.
- `ip_disclosure_events`: append-only audit (actor, action, from/to, details JSONB).
- `ip_disclosure_findings`: category CHECK (admin/ai/tto/authenticity/confidentiality/ownership/evidence/quality), severity, `source_type`, visibility (`internal/shared_researcher/shared_super_admin`), `is_preliminary`.
- `ip_disclosure_links`: URL, source_type, notes.
- `ip_disclosure_decisions`: decision CHECK, reason, `public_projection JSONB`.
- `ip_disclosure_files`: `object_key` as `bucket/path`, original name, MIME, size, sha256, classification default CONFIDENTIAL, `scan_status`.

Phase 2 (`docs/database/ip_disclosure_phase2.sql:1`):
- `ip_access_requests`: disclosure FK, requester FK, purpose, status pending/approved/denied/revoked/expired, decider + note + timestamp.

Legacy `projects` keeps its own `disclosure_status`, timeline, requested docs; only final IP publish/restrict updates its public projection.

RLS enabled on all IP tables; researcher select/insert policies + `is_admin()` reviewer paths.

## Storage + signed URLs

- Bytes stay in existing private Supabase buckets (`projects`, `avatars`).
- IP metadata registers `bucket/path` via `POST /api/ip/disclosures/:id/files` (`server/routes/ip.ts`).
- TTO/IP reviewers manually approve pending files through `POST /api/ip/files/:id/approve`; this changes `scan_status` to `clean` only for a TTO review case and writes an audit event.
- Download: `POST /api/ip/files/:id/signed-url` parses bucket/path, checks case access + clean-only scan status, issues `createSignedUrl(path, 300)`, audits `issue_file_url`.
- Access requests: list is RLS-filtered for ordinary users; reviewer list/decision paths use the service client after `canTtoReview`/`canDecidePublication` because Phase 2 has no direct UPDATE policy.
- Publication gate: `lib/projectPublication.ts` forces creates to `Internal / Pending Review`, rejects direct `Public/Published` mutations, keeps owner edits private, and grandfathers existing public records.
- Never persist signed URLs; frontend holds them transiently.

## AI + provenance

- AI screen is Admin-gated, throttled, synchronous rule pass + ledger write (`server/routes/ip.ts`).
- `recordAiDecision` appends to `ai_decisions` with `review_status: pending` (`server/services/aiGateway.ts`).
- Findings inserted with `source_type: ai`, `visibility: internal`, `is_preliminary: true`; sharing is explicit human action.
- Disclosure submission and Admin reruns call the assistant reviewer with `ASSISTANT_REVIEWER_KEY` when configured. The prompt requires source-linked reasoning and recommendations; the complete structured result and evidence packet are written to `ai_decisions`.
- Failure/uncertain output → `REVIEW_REQUIRED`, never auto-publish.

## News curation

- Public list and last-sync use the service client (`server/routes/news.ts`); drafts require Admin session. `status` is strict `Draft/Published`, `NOT NULL`, public RLS is `status='Published'` only (`docs/database/news_status_strict.sql`).
- Admin save validates `validateNewsPublication` for every `Published` item — title, summary, image, plus at least one HTTP evidence URL regardless of AI flag (`server/newsCuration.ts`).
- `Published` saves then run live source retrieval (`server/services/sourceVerification.ts:fetchSourceVerification`): HTTPS, redirect-following fetch, 8s timeout, HTTP 2xx, non-empty body, SHA-256 content hash, trusted-host flag. Failure returns `422`; the verification stamp is appended to `source_verification_notes`.
- Scout sync (`server/routes/scout.ts`) uses the service client and never inserts fallback content: empty provider output returns `didUpdate:false` with `reason: provider_unavailable`. Commercialization-derived items enter as `Draft` and require Admin publish with verified evidence.
- URL normalization, content hashing, and draft-preserving merge live in `server/newsCuration.ts`.
- Document extraction marks degraded output with `needs_review:true` (`server/routes/ai.ts`); the News curator blocks the first Publish attempt until a human verifies fields and evidence (`pages/News.tsx`).
- Saved-search localStorage alerts were deleted; `NotificationCenter` is messages-only.
- News cards link the "Source" indicator directly to the verified external URL (`pages/News.tsx`).

## Error + versioning

- Helper `ipSendError` maps service errors to 404/409/403, `42P01` to 503 migration message (`server/routes/ip.ts`).
- Optimistic concurrency: `.eq('version', current).update(version+1)`; conflict → `409 reload and retry`.
- Audit write failure blocks publication/access decisions by throwing; file/view paths log and continue where safe.

## Deployment

- Env server-only: `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GEMINI_API_KEY`, `GROQ_API_KEY`. Never prefix secrets with `VITE_`.
- Vercel: `api/index.ts` loads `dist/server.cjs`; `/api/*` rewrites in `vercel.json`.
- Migrations run manually in Supabase SQL Editor after backup: Phase 1 then Phase 2. Endpoints return `503` until applied.
- Local verification on 10 September 2026: `npm test -- --run` passed (18 files / 100 tests); lint and build also pass. Run `docs/database/news_status_strict.sql` in Supabase, then live database checks and production smoke tests.
