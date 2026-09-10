# API Reference

Base URL is same-origin. All `/api/*` routes are served by Express (`server.ts:234`).

## Conventions

- Auth: Better Auth session cookie, `credentials: "include"` on every client call (`lib/api.ts:5`, `lib/auth-client.ts:1`).
- `GET /api/health` is public (`server.ts:428`). All other `/api/*` require auth unless noted.
- Request validation: `validateBody(schema)` strips unknown fields, returns `400` with flattened Zod details (`server.ts:169`).
- Rate limiting: `throttleLimit(max, windowMs)` per user ID or IP (`server.ts:553`), used on AI, translate, AI screen, and match generation.
- Errors: `{ error: string }` with status `400 invalid input`, `401 unauthenticated`, `403 forbidden`, `404 not found`, `409 version/state conflict`, `429 rate limited`, `500 server error`, `503 missing service key or IP tables not migrated`.
- IP versioning: `ip_disclosures.version` increments on every mutation; stale writes return `409`.
- Tx scope: each IP transition updates `ip_disclosures` then inserts `ip_disclosure_events`; publication also inserts `ip_disclosure_decisions`.
- Assistant reviewer: disclosure submission and the Admin "Run AI screen" action call the server-side assistant reviewer when `ASSISTANT_REVIEWER_KEY` is configured. `ASSISTANT_REVIEWER_MODEL` selects the model and `ASSISTANT_REVIEWER_BASE_URL` selects an OpenAI-compatible endpoint. Provider/model provenance is written to `ai_decisions`; failures fall back without changing the human-review requirement.
- Evidence packet: reviewer prompts may cite researcher links, UG news, OpenAlex, Crossref, Google Patents, WIPO PATENTSCOPE, and IP portal references. LLM reasoning must include source IDs; source URLs are included in findings and are clickable in the UI.

## Health / Auth

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/health` | No | `{ status, time }` |
| `ALL` | `/api/auth/*splat` | No | Better Auth handler, mounted before JSON parsing (`server.ts:299`) |

## Profiles

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/profile/me` | Yes | Own profile by resolved profile ID (`server.ts:582`) |
| `GET` | `/api/profile/:id` | No | Public projection, UUID validated, role-table join fallback (`server.ts:602`) |
| `POST` | `/api/profile/update` | Yes | Mutable-field allowlist only (`server.ts:1670`) |

## Projects (legacy disclosure fields preserved)

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/projects/mine` | Own projects (`server.ts:1468`) |
| `POST` | `/api/projects` | Create, owner = caller, forced `Internal / Pending Review` via `protectProjectPublication` |
| `PUT` | `/api/projects/:id` | Owner/Admin, `PROJECT_MUTABLE_FIELDS`; direct `Public/Published` rejected `409`; owner edits stay `Internal`, grandfathered public records preserved |
| `DELETE` | `/api/projects/:id` | Owner/Admin (`server.ts:1521`) |
| `GET` | `/api/projects/:id/technical-brief` | Owner/Admin or active EOI reveal grant (`server.ts:1271`) |

Publication mapping: IP `publish` sets `projects.disclosure_status='Published'`, `visibility='Public'`; `restrict` sets `Approved`/`Internal` (`server.ts:1091`).

## Storage

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/storage/upload` | Buckets `projects`, `avatars` only; Base64 body; `validateStorageUpload`; owner metadata update (`server.ts:1188`) |
| `POST` | `/api/storage/sign` | Batch ≤100; owner/Admin/brief-release checks (`server.ts:1237`) |

IP files reuse the same buckets for bytes; metadata lives in `ip_disclosure_files`.

## IP Disclosures — lifecycle

| Method | Path | Allowed | Body / Query |
|---|---|---|---|
| `POST` | `/api/ip/disclosures` | Project owner | `createIpDisclosureRequestSchema`: `projectId` UUID, `answers` object, optional policy versions (`server.ts:668`) |
| `GET` | `/api/ip/disclosures` | Role-scoped | `?status=` optional; Admin/Super Admin see the reviewer queue, TTO/IP sees the shared TTO queue (`tto_review`, `tto_completed`, and forwarded `super_admin_review` records), others see their own |
| `GET` | `/api/ip/disclosures/:id` | Case viewer | UUID validated; `canViewDisclosure` (`server.ts:745`) |
| `PATCH` | `/api/ip/disclosures/:id` | Researcher, draft/action_required only | `answers`, policy versions (`server.ts:765`) |
| `POST` | `/api/ip/disclosures/:id/submit` | Researcher | `route`, `policyVersion`, `submissionPolicyVersion`, both `*Accepted: true`; draft + `tto_review` → `tto_review` (straight to IP Office), draft + opt-out → `submitted` (Admin triage), action_required → `submitted` |
| `POST` | `/api/ip/disclosures/:id/admin-accept` | Admin | submitted→admin_review→ai_screening auto-chain (`server.ts:794`) |
| `POST` | `/api/ip/disclosures/:id/admin-return` | Admin | `message`, optional `findingTitle`; creates shared_researcher finding (`server.ts:819`) |
| `POST` | `/api/ip/disclosures/:id/ai-screen` | Admin, 10/min | Rule-based advisory findings, `ai_decisions` ledger write, returns `202 { disclosure, findings, status: REVIEW_REQUIRED }` (`server.ts:841`) |
| `POST` | `/api/ip/disclosures/:id/send-to-tto` | Admin | admin/ai state → tto_review (`server.ts:1075`) |
| `POST` | `/api/ip/disclosures/:id/tto-complete` | TTO/IP | `tto_review` → `tto_completed`; invalid states return `409` (`server.ts:1377`) |
| `POST` | `/api/ip/disclosures/:id/send-to-super-admin` | TTO/IP | `tto_review` or `tto_completed` → `super_admin_review` (`server.ts:1393`) |

State machine: `lib/ipWorkflow.ts:38`. Invalid action+status returns `409`.

## IP Findings / Links / Files

| Method | Path | Allowed | Notes |
|---|---|---|---|
| `GET` | `/api/ip/disclosures/:id/findings` | Case viewer | Owners see `shared_researcher` only; reviewers see all (`server.ts:880`) |
| `POST` | `/api/ip/disclosures/:id/findings` | Admin/TTO | `category`, `title`, `body`, `severity`, `visibility`, `isPreliminary` (`server.ts:903`) |
| `POST` | `/api/ip/disclosures/:id/share-findings` | Admin/TTO | `findingId`, `visibility: shared_researcher|shared_super_admin`; `shared_super_admin` from AI/TTO review auto-advances to `super_admin_review` |
| `GET` | `/api/ip/disclosures/:id/links` | Case viewer | (`server.ts:956`) |
| `POST` | `/api/ip/disclosures/:id/links` | Admin/TTO | `url` http/https, localhost rejected; `sourceType`, `title`, `notes` (`server.ts:932`) |
| `GET` | `/api/ip/disclosures/:id/files` | Case viewer | Metadata only, no bytes (`server.ts:1168`) |
| `POST` | `/api/ip/disclosures/:id/files` | Case viewer | `objectKey: bucket/path`, `originalName`, `mimeType`, `sizeBytes ≤100MB`, `sha256?`, `classification`; sets `scan_status: pending` (`server.ts:1140`) |
| `POST` | `/api/ip/files/:id/approve` | TTO/IP or Super Admin | Manual review changes `scan_status` to `clean` for active TTO or final review cases; writes an `approve_file` audit event |
| `POST` | `/api/ip/files/:id/signed-url` | Case viewer | Service client `createSignedUrl(path, 300)`; clean scans only, audited |
| `GET` | `/api/ip/disclosures/:id/audit` | Case viewer | Metadata only: action, roles, from/to, timestamp, details (`server.ts:1342`) |

## IP Publication

`POST /api/ip/disclosures/:id/publication-decision` — Super Admin only (`server.ts:1378`). The final review workspace shows each project once with AI and TTO/IP findings, files, links, and audit events.

Body `publicationDecisionRequestSchema`:
`decision: publish|restrict|confidential_hold|request_information|reject`, `reason` required, `publicProjection?`.

Requires `super_admin_review`. Writes `ip_disclosure_decisions`, transitions via `applyTransition`, updates linked `projects` projection only for publish/restrict. Never publishes private files.

## IP Access Requests (Phase 2 table required)

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/ip/access-requests` | Role/RLS-scoped list, reviewers see all via service client; `503` if Phase 2 not applied |
| `POST` | `/api/ip/access-requests` | `disclosureId`, `purpose`; `503` if Phase 2 not applied |
| `POST` | `/api/ip/access-requests/:id/decision` | TTO/Super Admin via service client after role check; `approved|denied|revoked|expired` |

## Matches / EOI / Bookmarks / Challenges / AI

Preserved legacy surface, unchanged by IP work:

- Matches: `POST /api/matches` (`server.ts:1297`)
- Bookmarks: `GET /api/bookmarks`, `GET /api/bookmarks/:projectId/check`, `POST /api/bookmarks/toggle` (`server.ts:1540`)
- EOI: `POST /api/eois`, `GET /api/eois/sent|received|conversations|unread-count`, `PUT /api/eois/:id/read|status`, `POST /api/eois/read-thread` (`server.ts:1918`). EOI creation validates the metric and increments the related project's `expressions_of_interest` or `requests` counter.
- Translate/chat/embed: `POST /api/translate`, `/api/gemini/chat`, `/api/gemini/embed` (`server.ts:1737`)
- Admin extract: `POST /api/admin/extract-document` Admin only (`server.ts:1932`)
- AI profile/scout/match: `POST /api/ai-profile`, `/api/ai-scout/sync`, `/api/ai-match` (`server.ts:2063`)
- Challenges: `GET/POST /api/industry-challenges`, `PUT/DELETE /api/industry-challenges/:id`, `GET /api/challenge-matches`, `POST /api/challenge-matches/generate`, `PUT /api/challenge-matches/:id` (`server.ts:2625`)
- Ledger: `GET/POST /api/ai-decisions` Admin only (`server.ts:3158`)

## Examples

Create draft:
```bash
curl -X POST /api/ip/disclosures -H 'Content-Type: application/json' \
  -d '{"projectId":"<uuid>","answers":{}}' --cookie 'session=...'
```

Submit:
```bash
curl -X POST /api/ip/disclosures/<id>/submit -H 'Content-Type: application/json' \
  -d '{"route":"tto_review","policyVersion":"UG-RID-IP-v1.0","submissionPolicyVersion":"UG-RID-SUBMIT-v1.0","policyAccepted":true,"submissionPolicyAccepted":true}' --cookie 'session=...'
```
