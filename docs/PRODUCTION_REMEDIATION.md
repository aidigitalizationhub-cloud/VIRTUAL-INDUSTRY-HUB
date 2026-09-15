# Production Remediation And Cutover

This document is the production gate for the current implementation. The application code is Better Auth-only for protected API identity, while Supabase remains the PostgreSQL, RLS, vector, and storage provider.

## Required Migration Order

Take a tested database backup before any step. Run each item in the Supabase SQL Editor and stop on errors.

1. Run `supabase_setup.sql`.
2. Run `supabase_security_patch.sql`.
3. Run `supabase_rls_verify.sql` and record the result.
4. Create Better Auth tables using exactly one method: `supabase_better_auth_tables_manual.sql` or the equivalent Better Auth CLI migration against the same `DATABASE_URL`. Do not run both.
5. Run `supabase_better_auth_forced_reset.sql`. Existing Supabase password hashes are intentionally not copied; users must complete Better Auth password recovery.
6. Run `better_auth_repair_credential_accounts.sql` if its preflight conditions require it.
7. Verify the mapping and collision queries, then run `supabase_better_auth_linkage_migration.sql` to remap application ownership to Better Auth IDs. Stop if it reports duplicate mappings or both legacy and Better Auth profiles.
8. Deploy the server-side Better Auth authorization path and verify login, reset, logout, role resolution, profile access, and protected API authorization.
9. Run `supabase_better_auth_migration.sql` to replace `auth.uid()`-based policies/functions with Better Auth request-claim helpers. This follows the tables and linkage steps.
10. Run `supabase_security_hardening.sql` after the Better Auth migration. Review existing rows before validating its `NOT VALID` constraints.
11. Only after live verification, disable Supabase Auth as an application login path. Retain legacy rows only for rollback/data history as required by the migration plan.
12. Run `supabase_advisor_security_fix.sql` for the former security-definer views/mapping table, then run `supabase_advisor_warning_fix.sql` for extension placement, unrestricted news writes, storage listing, and server-only RPC privileges. Migrate legacy browser matching calls before uncommenting the `match_profiles`/`match_projects` revokes in that file.

The IP disclosure migrations are separate: run `ip_disclosure_phase1.sql`, then `ip_disclosure_backfill.sql` if needed, then `ip_disclosure_phase2.sql`, `ip_disclosure_phase3.sql`, and `ip_disclosure_phase4.sql` in that order.

The news strictness migration is separate: run `news_status_strict.sql` after backup to backfill NULL statuses to Draft, restrict public reads to explicit `Published`, and enforce `NOT NULL` + `Draft/Published` check. Re-run `supabase_rls_verify.sql` and the Advisor afterwards.

## Environment And Deployment Gates

Required server-side configuration: `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (Supabase transaction pooler URI), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `CORS_ORIGINS`. Configure `GEMINI_API_KEY` for the primary AI provider and `GROQ_API_KEY` for fallback. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` for production password-reset delivery. Configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` if Google sign-in is enabled. `ASSISTANT_REVIEWER_KEY` and its model/base URL are optional.

Supabase's leaked-password protection is configured in the dashboard, not SQL: open `Authentication` → `Attack Protection` and enable the leaked-password protection option if the project plan supports it. This setting applies to Supabase Auth. The application uses Better Auth as its application identity provider, so Better Auth password policy and reset configuration must also be maintained separately.

Never expose server secrets through `VITE_` variables. `DATABASE_URL` must use the Supabase transaction pooler, not the retired direct `db.<project>.supabase.co` host. Set the production origin in `BETTER_AUTH_URL` and `CORS_ORIGINS`.

Build with `npm run build` and run with `npm start`, or use the checked-in Vercel rewrite/function configuration. Confirm `dist/server.cjs` is included in the deployed API function. Private `projects` storage and signed URLs must be verified in the deployed environment.

## Current Security Boundaries

- Uploads are limited to 15 MiB. General document validation allows `.txt`, `.doc`, and `.docx` with whitelisted MIME types. Storage validation additionally allows PDF and image extensions/types. JSON uses a slightly larger Base64 transport limit.
- Public profile responses are projected to `id`, name, title, role, bio, company, department, website URLs, and avatar URL. Email, CV-derived `ai_profile`, embedding, and other private profile fields are excluded.
- Gemini is tried first across its configured model list; Groq is fallback. Embeddings use Gemini because Groq has no embedding endpoint. Actual provider/model, prompt version, subject, hashes, and result metadata are written to `ai_decisions` when the service client and schema are available. AI findings are preliminary/advisory and cannot publish, reject, or grant legal clearance.
- Throttling is per endpoint and user/IP, in process memory. Current limits are: AI screen 10/min, translate 30/min, chat 30/min, embeddings 100/min, document extraction 15/min, AI profile 10/min, scout sync 5/min, AI match 20/min, and challenge-match generation 12/min. This limiter is not shared across replicas.
- New messages are stored plaintext. The legacy AES-GCM helper only decrypts historical envelopes; its key material shipped in the client and is not a security boundary. KMS-backed server-side encryption, key rotation, and migration of plaintext/legacy messages are required before claiming message confidentiality at rest.

## Verification Status And Remediation

On 10 September 2026, the local command `npm test -- --run` passed: 18 test files and 100 tests. Lint and build also pass on the modular server layout. Before production approval, run `docs/database/news_status_strict.sql` in Supabase after backup, then live SQL/RLS verification, deployed smoke tests, SMTP delivery, backup restore, and multi-instance rate-limit tests.

Before production approval, run `npm run lint`, `npm run build`, the full test command, `supabase_rls_verify.sql`, authenticated role-matrix checks, upload boundary checks, password reset delivery, signed-URL expiry/authorization checks, AI provenance persistence checks, and a backup restore rehearsal. Replace the in-memory limiter and complete server-side encryption remediation before operating a multi-instance deployment or representing messages as encrypted.
