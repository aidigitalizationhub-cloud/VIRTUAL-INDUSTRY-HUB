# Backend Documentation

## Runtime

- Entry: `server.ts:234` (`const app = express()`), production bundle `dist/server.cjs` via esbuild (`package.json:9`).
- Scripts: `dev: tsx server.ts`, `build: vite build + esbuild`, `start: node dist/server.cjs`, `lint: tsc --noEmit`, `test: vitest run`.
- JSON limits `15mb` (`server.ts:302`). Security headers + strict CORS allowlist on every request (`server.ts:267`).
- Dev logger skips static/Vite noise, logs `/api` method→status→user (`server.ts:239`).

## Auth

- Better Auth is sole identity (`server.ts:422`). Session resolved per request; `markPasswordResetComplete` kept in sync.
- `req.user`, `resolvedProfileId`, `userRole` attached after profile lookup by ID then email.
- `Roles` = Admin, Industry/Partner, Researcher, Student, Investor (`server.ts:465`). IP layer additionally accepts `TTO`, `TTO/IP`, `IP Office`, `Super Admin` role strings from `profiles.role` (`server/ip/ipAuthz.ts:1`).
- Browser never holds service keys. `getServiceClient()` is server-only (`server.ts:329`); `getDbClientForRequest()` prefers caller token, falls back to service client (`server.ts:508`).

## Middleware

- `validateBody(schema)` (`server.ts:169`): Zod `safeParse`, strips unknown fields, `400` on failure.
- `requireRole(...roles)` (`server.ts:495`): exact role match, `403` otherwise.
- `throttleLimit(max, windowMs)` (`server.ts:553`): in-memory per user/IP with 10-min eviction.
- `authenticateUser` before all protected routes; Better Auth handler mounted before JSON parsing (`server.ts:299`).

## Module layout (scalable)

- `server.ts` — composition root, middleware, thin route adapters.
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
- IP metadata registers `bucket/path` via `POST /api/ip/disclosures/:id/files` (`server.ts:1140`).
- TTO/IP reviewers manually approve pending files through `POST /api/ip/files/:id/approve`; this changes `scan_status` to `clean` only for a TTO review case and writes an audit event.
- Download: `POST /api/ip/files/:id/signed-url` parses bucket/path, checks case access + clean-only scan status, issues `createSignedUrl(path, 300)`, audits `issue_file_url`.
- Access requests: list is RLS-filtered for ordinary users; reviewer list/decision paths use the service client after `canTtoReview`/`canDecidePublication` because Phase 2 has no direct UPDATE policy.
- Publication gate: `lib/projectPublication.ts` forces creates to `Internal / Pending Review`, rejects direct `Public/Published` mutations, keeps owner edits private, and grandfathers existing public records.
- Never persist signed URLs; frontend holds them transiently.

## AI + provenance

- AI screen is Admin-gated, throttled, synchronous rule pass + ledger write (`server.ts:841`).
- `recordAiDecision` appends to `ai_decisions` with `review_status: pending` (`server.ts:361`).
- Findings inserted with `source_type: ai`, `visibility: internal`, `is_preliminary: true`; sharing is explicit human action.
- Disclosure submission and Admin reruns call the assistant reviewer with `ASSISTANT_REVIEWER_KEY` when configured. The prompt requires source-linked reasoning and recommendations; the complete structured result and evidence packet are written to `ai_decisions`.
- Failure/uncertain output → `REVIEW_REQUIRED`, never auto-publish.

## Error + versioning

- Helper `ipSendError` maps service errors to 404/409/403, `42P01` to 503 migration message (`server.ts:655`).
- Optimistic concurrency: `.eq('version', current).update(version+1)`; conflict → `409 reload and retry`.
- Audit write failure blocks publication/access decisions by throwing; file/view paths log and continue where safe.

## Deployment

- Env server-only: `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GEMINI_API_KEY`, `GROQ_API_KEY`. Never prefix secrets with `VITE_`.
- Vercel: `api/index.ts` loads `dist/server.cjs`; `/api/*` rewrites in `vercel.json`.
- Migrations run manually in Supabase SQL Editor after backup: Phase 1 then Phase 2. Endpoints return `503` until applied.
- Verification: `npm run lint`, `npm test -- --run` (12 files / 68 tests), `npm run build`.
