# System Upgrade Blueprint

## Purpose

This document defines the work required to upgrade the UG Virtual Industry Hub into a fast, secure, maintainable, and scalable platform.

The implementation order is intentional:

1. Routing and authenticated navigation
2. Performance and data loading
3. Security and authorization
4. Data integrity and identity migration
5. Storage and confidential IP protection
6. Domain architecture and background processing
7. Observability, testing, and operations

Security is a release requirement. No feature is complete until its authorization, data exposure, failure behavior, and auditability are verified.

## Current Assessment

The Better Auth migration is functionally working:

- Better Auth login returns successful sessions.
- The dashboard route now receives authenticated state.
- Profile, project, EOI, bookmark, challenge, and storage orphan audits returned zero orphaned records.
- Project and storage ownership IDs are linked to the canonical Better Auth IDs.

The application is not yet world-class because it still contains several competing architectural patterns:

- Better Auth cookies are used by the server.
- The browser also calls Supabase directly with an anonymous client.
- Private authorization is split between client code, Supabase RLS, and Express middleware.
- Dashboard data is loaded through multiple serialized waterfalls.
- AI synchronization can run during application startup.
- Storage documents are represented by URLs rather than an ownership manifest.
- Several data operations still trust client-supplied user IDs.
- Database constraints, RLS policies, and RPC privileges are incomplete.

## Target Architecture

```text
Browser
  -> React application and router
  -> Better Auth session cookie
  -> Express Backend-for-Frontend API
  -> authorization and validation layer
  -> PostgreSQL/Supabase server client or controlled RPC
  -> canonical application identity
  -> domain data and private storage
```

The canonical identity must be:

```text
better_auth."user".id
  = public.profiles.id
  = projects.owner_id
  = all user relationship columns
```

The browser must not choose ownership, role, sender identity, reviewer identity, or administrator privileges. These values must be derived from the authenticated Better Auth session on the server.

## Phase 1: Routing and Authentication State

Routing is the first priority because a valid session is useless if the application renders the wrong route or redirects before session restoration finishes.

### Required behavior

- A successful login must update the root application authentication state.
- A successful login must navigate to `/#/dashboard` when using `HashRouter`.
- Direct navigation to `/#/dashboard` must wait for session restoration before deciding whether to redirect.
- Missing profiles must not be silently treated as a researcher onboarding profile.
- Profile-loading failures must render an explicit error state.
- Logout must clear session state, cached account data, timers, and route-specific state.
- Admin login must use the same authenticated state transition as normal login.
- Password reset must return to a known login route and must not leave a stale session in memory.
- OAuth callback URLs must use the router format actually deployed.
- Session expiry must clear private UI state and redirect to a safe public route.

### Routing design

Use an explicit authentication state machine:

```text
unknown -> authenticated -> unauthenticated
unknown -> unauthenticated
authenticated -> unauthenticated on logout or expiry
```

Do not use `false` as the initial state for authentication. The initial state must be `unknown` so protected routes cannot redirect before the session request completes.

Use a single application session provider exposing:

```text
session
user
profile
role
status
signIn
signOut
refresh
```

Protected routes must consume this provider rather than receiving independent boolean props from multiple components.

### Routing files to update

- `App.tsx`
  - Centralize session restoration.
  - Add route-level loading and error states.
  - Keep `HashRouter` callback URLs consistent.
  - Remove redirect races.
  - Remove dashboard rendering with a null profile.
- `lib/auth-client.ts`
  - Expose one session provider or session hook.
  - Add session refresh and expiry handling.
  - Avoid repeated `getSession()` calls.
- `components/AuthModal.tsx`
  - Use the shared authentication transition.
  - Report successful authentication to the provider.
  - Remove stale Supabase Auth messaging.
- `pages/AdminLogin.tsx`
  - Use the shared authentication transition.
  - Keep role enforcement server-authoritative.
- `pages/ForgotPassword.tsx`
  - Use the shared API client and normalized email.
- `pages/ResetPassword.tsx`
  - Handle token expiry explicitly.
  - Clear stale session state after reset.
- `pages/VerifyOTP.tsx`
  - Confirm whether this flow remains required after the Better Auth cutover.
- `index.tsx`
  - Keep StrictMode-safe, abortable effects.
- `vercel.json`
  - Verify that API rewrites and SPA/hash routing are consistent.
- `api/index.ts`
  - Keep the production API entrypoint importing the active source server.
- Root `App.tsx` outside `the codebase`
  - Remove or isolate the stale application that uses `demo-user`.

### Routing acceptance criteria

- Login returns a session and lands on the dashboard without a manual refresh.
- Direct dashboard loading does not flash the home page.
- A valid session never redirects to `/` because of an initial false state.
- A missing profile displays a recoverable setup state.
- Admin login cannot enter a non-admin dashboard.
- Session expiry removes private data from the screen.
- Every route has a deliberate public, authenticated, or admin access policy.

## Phase 2: Performance and Data Loading

### Immediate performance fixes

- Remove `AIScoutService.autoSyncNews()` from global application startup.
- Move news synchronization to a scheduled or queued backend job.
- Return cached news immediately.
- Prevent repeated sync work using a database lock and freshness window.
- Replace dashboard request waterfalls with parallel requests or one bootstrap request.
- Stop signing protected documents while rendering project lists.
- Sign protected documents only when the user opens them.
- Remove duplicate unread-count polling from `App.tsx` and `Dashboards.tsx`.
- Replace 15-second reveal polling with local expiry timers and focus-based refresh.
- Cancel requests when routes or dashboard tabs unmount.

The previous startup path produced an AI synchronization request lasting over three minutes. No blocking AI operation may run during dashboard initialization.

### Dashboard bootstrap

Add:

```text
GET /api/dashboard/bootstrap
```

The endpoint must derive the user from the Better Auth session and return only role-relevant data:

```json
{
  "profile": {},
  "permissions": {},
  "projects": [],
  "notifications": {},
  "conversations": [],
  "bookmarks": [],
  "matches": []
}
```

The response must use explicit columns, pagination, and permission-aware projections. It must not return sensitive fields merely because they exist in a table.

### Client data layer

Introduce TanStack Query or an equivalent query layer for:

- Session and profile
- Projects
- Project detail
- Bookmarks
- EOIs and conversations
- Notifications
- Challenges and matches
- Admin data

Required capabilities:

- Request deduplication
- Stale-time caching
- Request cancellation
- Optimistic updates for safe mutations
- Targeted cache invalidation
- Retry policies by error type
- Focus and reconnect refresh
- Loading and error states per data area

### Performance files to update

- `App.tsx`
  - Remove global blocking work.
  - Centralize session/profile loading.
  - Remove duplicate notification polling.
- `pages/Dashboards.tsx`
  - Split role dashboards.
  - Parallelize independent data loading.
  - Remove repeated full-project queries.
  - Fetch matching data in pages.
- `services/storageService.ts`
  - Stop repeated session lookups.
  - Stop per-project reveal queries.
  - Stop signing list URLs.
  - Separate current-profile and public-profile methods.
- `services/challengeService.ts`
  - Remove direct private Supabase mutations.
  - Use server APIs.
- `pages/ProjectDetail.tsx`
  - Replace the multi-stage waterfall with one project-detail request.
- `pages/Projects.tsx`
  - Use cached project data and paginated results.
- `pages/Products.tsx`
  - Reuse project and bookmark cache.
- `components/NotificationCenter.tsx`
  - Reuse centralized conversations and notification state.
- `lib/api.ts`
  - Add abort signals, timeouts, request IDs, deduplication, and typed errors.
- `services/aiScoutService.ts`
  - Remove startup execution.
  - Use job status and freshness checks.

### Backend performance files to update

- `server.ts`
  - Add dashboard bootstrap endpoint.
  - Batch challenge-match queries.
  - Remove per-request migration writes.
  - Reuse the Supabase service client.
  - Add explicit query projections.
  - Add route duration and query-count instrumentation.
- `lib/auth.ts`
  - Configure PostgreSQL pool limits and timeouts.
  - Cache or avoid repeated migration-status writes.
- `pages/Dashboards.tsx`
  - Split into role and feature-level lazy modules.

### Performance targets

- Dashboard shell visible within 1 second after session resolution.
- Dashboard data usable within 2 seconds on a normal connection.
- No AI request during dashboard startup.
- No N+1 query pattern in dashboard or challenge-match endpoints.
- Project list does not sign private documents.
- Collection endpoints are paginated.
- Every expensive endpoint has a timeout and bounded input.

## Phase 3: Security and Authorization

Security must be enforced server-side and in the database. Client-side checks are user-experience checks only.

### One private data boundary

Move all account-linked operations behind authenticated server APIs:

- Profiles
- Projects
- Bookmarks
- EOIs and messages
- Challenges
- Challenge matches
- Storage authorization
- Account deletion
- Admin reads and mutations
- AI decision records

Direct Supabase browser access may remain only for explicitly public, non-sensitive data.

### Authorization rules

- Derive the current user only from Better Auth.
- Ignore client-supplied `userId` for ownership-sensitive operations.
- Derive project owner from the session for project creation.
- Derive EOI sender from the session.
- Validate EOI recipient against the project or target profile server-side.
- Enforce admin authorization on every admin endpoint.
- Enforce allowed state transitions in database functions.
- Never trust a client role, profile role, or `isAdmin` value.
- Return generic authentication errors without leaking account existence.
- Apply rate limits per authenticated user and IP through a shared limiter.

### Data exposure controls

Do not expose raw `select('*')` records to public or ordinary authenticated users.

Create narrow views or RPC projections for:

- Public directory profiles
- Public researcher profiles
- Private owner profiles
- Public project summaries
- Authorized project details
- Private research and funding data
- Admin-only audit data

Sensitive fields requiring explicit authorization include:

- Email addresses
- Embeddings
- AI profiles
- Semantic summaries
- Grant and fellowship details
- Internal project notes
- Technical document paths
- Reviewer information
- AI decision payloads

### Security files to update

- `server.ts`
  - Centralize authorization.
  - Remove client-ID trust.
  - Add route-specific validation.
  - Add request IDs and secure error responses.
- `lib/auth.ts`
  - Harden session and database configuration.
  - Configure pool limits and timeouts.
- `lib/auth-client.ts`
  - Keep only browser-safe session operations.
- `services/storageService.ts`
  - Remove private direct Supabase mutations.
  - Remove caller-controlled ownership.
- `services/challengeService.ts`
  - Route all private operations through the server.
- `components/AdminDashboard.tsx`
  - Remove client-side admin authority.
- `pages/News.tsx`
  - Remove direct client admin checks as authorization.
- `pages/ProjectDetail.tsx`
  - Use server-authorized project detail responses.
- `supabase_better_auth_migration.sql`
  - Harden RLS, function privileges, and identity helpers.
- `supabase_security_patch.sql`
  - Remove remaining Supabase Auth assumptions.
- `supabase_rls_verify.sql`
  - Test policy behavior, not only policy existence.

## Phase 4: Identity Migration and Data Integrity

### Canonical identity

The migration has already confirmed zero orphaned records for the audited tables. The final design must enforce this permanently:

```text
better_auth."user"(id)
  -> public.profiles(id)
  -> all application user relationships
```

Required relationships include:

- `student_profiles.user_id`
- `researcher_profiles.user_id`
- `investor_profiles.user_id`
- `industry_profiles.user_id`
- `projects.owner_id`
- `projects.reviewer_assignment`
- `eois.sender_id`
- `eois.recipient_id`
- `bookmarks.user_id`
- `industry_challenges.partner_id`
- `challenge_matches.candidate_user_id`
- `challenge_matches.partner_user_id`
- `interaction_logs.user_id`
- `account_deletions.user_id`
- `ai_decisions.reviewed_by`
- `storage.objects.owner`

### Integrity work

- Validate all `NOT VALID` foreign keys.
- Recreate child foreign keys dropped during migration.
- Add deliberate `ON DELETE` behavior.
- Add uniqueness for the Better Auth credential identity tuple.
- Add foreign keys to the canonical profile or identity table.
- Keep migration mappings auditable and read-only.
- Remove runtime email fallback after migration validation.
- Remove `demo-user` and `industry_partner_default` fallbacks.
- Resolve duplicate email identities explicitly.
- Keep project IDs stable during identity migration.

### Database constraints

Add constraints for:

- Valid profile roles and user types.
- Valid project visibility and disclosure states.
- Valid EOI and challenge states.
- Score ranges from 0 through 100.
- Non-negative project counters.
- Numeric funding amounts and currency codes.
- Valid timestamps and embargo relationships.
- Atomic and legal state transitions.

### Database files to update

- `supabase_setup.sql`
  - Become a complete canonical schema, not a partial bootstrap.
- `supabase_better_auth_forced_reset.sql`
  - Keep correct Better Auth credential fields.
- `better_auth_repair_credential_accounts.sql`
  - Keep repair behavior explicit and idempotent.
- `supabase_better_auth_linkage_migration.sql`
  - Keep the one-time linkage migration safe and documented.
- `supabase_better_auth_migration.sql`
  - Recreate and validate all foreign keys.
- `supabase_security_patch.sql`
  - Remove obsolete Auth policies.
- `supabase_rls_verify.sql`
  - Add complete orphan, privilege, policy, and constraint verification.
- `ba-schema-diff.mts`
  - Compare types, nullability, defaults, keys, indexes, RLS, and privileges.

## Phase 5: Storage and Confidential IP

### Storage model

Private files must not be represented by public URLs. Store object paths and metadata in an application-owned manifest:

```text
project_documents
- id uuid primary key
- project_id uuid not null
- object_path text not null unique
- document_type text not null
- access_tier text not null
- uploaded_by uuid not null
- malware_scan_status text not null
- content_sha256 text
- byte_size bigint
- mime_type text
- created_at timestamptz not null
- deleted_at timestamptz
```

### Storage rules

- Use private buckets for technical briefs and attachments.
- Store exact object paths, never full public URLs as authorization data.
- Generate signed URLs only after server-side authorization.
- Use deterministic paths such as `projects/{project_id}/{document_id}`.
- Store ownership in application metadata and synchronize storage owner fields.
- Validate bucket, path, content type, size, and project relationship.
- Add malware scanning and checksum validation for confidential uploads.
- Audit every protected document access.
- Do not use substring matching against URL text for authorization.
- Treat avatar visibility separately from confidential project files.

### Storage files to update

- `services/storageService.ts`
  - Store object paths.
  - Request signed URLs on demand.
  - Route private uploads through the server.
- `server.ts`
  - Add authorized upload and signed-download endpoints.
- `supabase_setup.sql`
  - Add `project_documents` and storage policies.
- `supabase_better_auth_migration.sql`
  - Replace URL substring authorization.
- `pages/ProjectDetail.tsx`
  - Fetch protected files only when requested.
- `pages/Dashboards.tsx`
  - Do not sign documents during list rendering.

## Phase 6: Domain and Platform Architecture

### Domain modules

Organize the large dashboard and service layers into domain modules:

```text
domains/
  identity/
  profiles/
  projects/
  documents/
  conversations/
  eoIs/
  challenges/
  matching/
  news/
  administration/
```

Each domain should have:

- Typed request and response contracts.
- Server authorization rules.
- Database queries or RPCs.
- Validation schemas.
- Unit and integration tests.
- Audit events for sensitive mutations.

### Background jobs

Move expensive operations to durable jobs:

- AI news scouting
- AI profile generation
- Embedding generation
- Match generation
- Large document extraction
- Email delivery
- Session and token cleanup
- Storage cleanup

Use database-backed job states:

```text
queued
running
completed
failed
retrying
```

Jobs require retries, timeouts, idempotency keys, dead-letter handling, and visible failure status.

### AI safeguards

- Add provider timeouts.
- Bound retries and fallback chains.
- Add circuit breakers.
- Limit concurrent AI work.
- Bound message history and prompt size.
- Limit candidate counts in matching prompts.
- Cache embeddings.
- Move large matching operations to jobs.
- Store provider, model, latency, token usage, and failure metadata.

### Durable conversations

Replace client-generated thread identifiers such as project/partner string combinations with a database-backed conversation model:

```text
conversations
conversation_participants
conversation_messages
```

Messages must have durable IDs, server-derived participants, read states, timestamps, and audit history.

## Phase 7: Observability and Operations

### Required telemetry

Record:

- Request ID and trace ID.
- Route template and HTTP method.
- Authenticated user ID where safe.
- Status code and duration.
- Database duration and query count.
- Supabase duration.
- AI provider duration and model.
- Cache hit and miss.
- Response size.
- Error category.
- Queue duration and retry count.

### Health endpoints

Implement separate endpoints:

```text
GET /api/health
GET /api/readiness
GET /api/metrics
```

Health confirms process availability. Readiness verifies required database, Better Auth, storage, and configuration dependencies. Metrics expose latency and error trends without leaking secrets.

### Operations files to update

- `server.ts`
  - Add structured request logging and readiness checks.
- `lib/auth.ts`
  - Add pool lifecycle and shutdown handling.
- `services/aiScoutService.ts`
  - Add shared locking and job state.
- `package.json`
  - Add query/cache, validation, telemetry, and job dependencies only when needed.
- `.env.example`
  - Document required local and production settings without secrets.
- `docs/`
  - Maintain deployment runbooks, migration runbooks, incident procedures, and rollback plans.

## Database Performance Plan

Add and verify indexes for:

- `projects(owner_id)`
- `projects(disclosure_status, visibility, created_at desc)`
- `projects(visibility, disclosure_status, embargo_until)`
- `eois(sender_id, created_at desc)`
- `eois(recipient_id, read, created_at desc)`
- `eois(project_id, created_at desc)`
- `bookmarks(user_id, created_at desc)`
- `profiles(role)`
- `profiles(user_type)`
- `interaction_logs(user_id, created_at desc)`
- `projects(reviewer_assignment)`
- `ai_decisions(subject_id, created_at desc)`
- Vector columns using HNSW or IVFFlat after operator-class verification.

Use `EXPLAIN (ANALYZE, BUFFERS)` on realistic datasets before and after indexing.

Replace these patterns:

- `select('*')` on large or sensitive tables.
- `LIKE '%object_path%'` storage authorization.
- Application-side joins for large collections.
- Check-then-insert bookmark operations.
- Read-then-update metric counters.
- Per-match challenge queries.
- Unbounded vector search result counts.

## RLS and RPC Hardening

For every `SECURITY DEFINER` function:

- Set a fixed `search_path`.
- Validate all parameters.
- Bound result counts.
- Reject malformed UUIDs safely.
- Revoke execute from `PUBLIC`.
- Grant execute only to required roles.
- Return narrow projections.
- Add negative authorization tests.

RLS tests must cover:

- Anonymous access.
- Authenticated unrelated users.
- Record owners.
- EOIs senders and recipients.
- Challenge participants.
- Institution members.
- Administrators.
- Expired access.
- Cross-tenant access.
- Deleted or archived records.

## File Change Inventory

### Highest-priority application files

- `App.tsx`
- `lib/auth-client.ts`
- `components/AuthModal.tsx`
- `pages/AdminLogin.tsx`
- `lib/api.ts`
- `server.ts`
- `lib/auth.ts`
- `pages/Dashboards.tsx`
- `services/storageService.ts`
- `services/challengeService.ts`
- `pages/ProjectDetail.tsx`
- `pages/Projects.tsx`
- `pages/Products.tsx`
- `components/NotificationCenter.tsx`
- `components/AdminDashboard.tsx`
- `services/aiScoutService.ts`
- `pages/ResetPassword.tsx`
- `pages/ForgotPassword.tsx`
- `pages/VerifyOTP.tsx`
- `index.tsx`
- `api/index.ts`
- `vercel.json`

### Highest-priority database files

- `docs/database/supabase_setup.sql`
- `docs/database/supabase_better_auth_tables_manual.sql`
- `docs/database/supabase_better_auth_forced_reset.sql`
- `docs/database/better_auth_repair_credential_accounts.sql`
- `docs/database/supabase_better_auth_linkage_migration.sql`
- `docs/database/supabase_better_auth_migration.sql`
- `docs/database/supabase_security_patch.sql`
- `docs/database/supabase_rls_verify.sql`
- `docs/database/ba-schema-diff.mts`

### Supporting files

- `.env.example`
- `package.json`
- `docs/BETTER_AUTH_CUTOVER.md`
- `docs/database/BETTER_AUTH_CUTOVER.md`
- `docs/IP_DATABASE_ARCHITECTURE.md`
- `docs/IP_INTEGRATION_PLAN.md`

## Release Gates

No phase is production-ready until these gates pass:

- TypeScript compilation passes.
- Unit tests pass.
- Integration tests pass.
- Build passes.
- Database migrations run on a production-like snapshot.
- Migration rerun behavior is tested.
- All identity-linked orphan checks return zero.
- RLS negative tests pass.
- No private endpoint accepts caller-controlled ownership.
- No private file is publicly readable.
- Dashboard performance targets are measured.
- AI jobs are not on the request-critical startup path.
- Errors are observable without leaking secrets.
- Rollback steps are documented and tested.

## Recommended Coding Sequence

Implement in this order:

1. Complete the routing/session provider and dashboard transition.
2. Remove startup AI synchronization.
3. Add dashboard bootstrap and request caching.
4. Fix profile addressing and remove `/me` misuse.
5. Establish the server as the private data boundary.
6. Secure storage and add the document manifest.
7. Complete foreign keys, indexes, RLS, and RPC privilege hardening.
8. Replace N+1 queries and move expensive work to jobs.
9. Add observability and performance budgets.
10. Add institutional tenancy and confidential IP workflows.

The first coding sprint should focus only on routing, session state, startup performance, and the private API boundary. New product features should wait until those foundations are stable.
