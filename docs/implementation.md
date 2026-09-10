# Project Disclosure Implementation

## Purpose

Add a guided disclosure step to the existing **+ New Project Disclosure** form. A researcher first creates the project, answers short IP questions, accepts the submission policy, and chooses whether the institution TTO/IP Office should review the disclosure.

The hosted, pre-trained AI assists with scouting, authenticity, evidence, and risk findings. It does not decide patentability, ownership, legal protection, or legal safety.

## Researcher Workflow

### Step 1: New Project Disclosure

The existing form remains the first screen. The researcher completes the fields already shown in the product:

- Research title or product name
- Research area
- Department
- Executive summary
- Research status or maturity
- Budget and funding need
- Start date
- Achievements and milestones
- Primary image and supporting evidence
- Technical briefing or disclosure document
- Open-to-collaboration setting

The researcher clicks **Continue to IP Questions**. The project is not published at this point. Attached files are stored privately and linked to the draft.

### Step 2: Short IP Questions

Use `Yes`, `No`, or `Not sure` for each question:

- Could this project contain a new invention, method, device, software, design, composition, dataset, plant variety, or other IP?
- Has any part been shared publicly in a paper, thesis, poster, presentation, website, repository, social media, demo, sale, or conference?
- Has an IP application already been filed?
- Who contributed to the work?
- Was university funding, equipment, staff, sponsored research, or another organization’s material used?
- Is there an NDA, collaboration agreement, material-transfer agreement, sponsor obligation, or third-party IP?
- Which information is safe for the public project summary?
- Which files or sections should remain restricted or confidential?

The researcher then chooses one route:

1. **Send to TTO/IP Office**: recommended when the project may contain IP, confidential information, an ownership issue, or an earlier public disclosure.
2. **Opt out of TTO/IP review**: the researcher confirms that they do not want the TTO workflow for this submission. This does not remove Admin review, AI checks, the publication policy, or the audit record.

The system must never hide the TTO option or pressure the researcher to opt out. `Not sure` answers should recommend Route 1.

### Step 3: Terms and Submission Policy

Before submission, show the policy in plain language. Require an unchecked checkbox and record the policy version, timestamp, user, and disclosure snapshot hash.

Suggested acknowledgement:

> I confirm that the information and files are submitted for institutional review and technology-transfer activities. I understand that publication or sharing may affect confidentiality and IP options. I have identified known contributors, funding, sponsors, agreements, and previous public disclosures to the best of my knowledge. I understand that AI output is advisory and that an authorized human reviewer makes the final platform decision.

Buttons:

- **Submit Disclosure**
- **Save as Draft**
- **Back to Questions**

After submission, show the route and status clearly. Do not show “patent protected” or “legally safe.”

## Route 1: TTO/IP Office Review

### 01 Researcher: Creates Disclosure

The complete project, IP answers, policy acceptance, route selection, and private attached files are automatically sent to the Admin review queue and the institution TTO/IP queue. The researcher sees a confirmation and can track status.

### 02 IP Questions: Declares Risk

The answers create the initial disclosure record. The researcher can later add contributors, disclosure dates, files, links, or corrections when the Admin or TTO requests information.

### 03 AI Scouting and Findings

After submission, the hosted pre-trained AI performs bounded tasks:

- Scans the project and permitted attachments for possible IP categories.
- Highlights potentially confidential passages.
- Extracts possible public disclosure dates, channels, and links.
- Flags ownership, funding, sponsor, NDA, and contributor issues.
- Checks claims for internal consistency.
- Searches approved public sources for related publications, patents, and technologies.
- Produces evidence-linked findings and a recommendation for human review.

The AI result is shown as **advisory findings**, not as a final decision. Failed, uncertain, or unsupported results route to human review.

### 04 Admin Completeness Review

Admin checks:

- Required project fields are complete.
- Files are present, readable, and safe to process.
- The researcher accepted the correct policy version.
- The selected route and IP answers are recorded.
- The project does not violate platform rules.

Admin can:

- **Accept and Send to TTO**
- **Return to Researcher** with a request for more information
- **Add an Admin Finding**
- **Share Findings** with the Super Admin and Researcher

Admin should consult the AI findings and other permitted sources, but Admin is not replacing the TTO/IP Office or legal counsel.

### 05 TTO/IP Office Review

The TTO/IP Office receives the complete disclosure, AI findings, Admin findings, links, and private files. TTO staff can:

- Add findings, comments, and questions.
- Upload supporting files, letters, reports, prior-art notes, or review documents.
- Add approved source links.
- Request more information from the researcher.
- Recommend protection assessment.
- Mark information as public, restricted, or confidential.
- Share a controlled finding with the Super Admin and Researcher.

TTO findings must identify the reviewer, date, policy version, supporting source or file, and whether the finding is preliminary or final for platform workflow.

### 06 Super Admin Publication Decision

The Super Admin sees the Admin and TTO findings, the researcher’s answers, and the AI evidence summary. The Super Admin can publish only the approved public summary, not the private disclosure or technical files.

Available decisions:

- **Approve Public Listing**: publish the cleared public projection.
- **Keep Restricted**: list only for approved users and require controlled access for additional information.
- **Confidential Hold**: do not publish while protection, ownership, or confidentiality review continues.
- **Return for More Information**: send a specific request to the researcher or TTO.

The Super Admin decision and reason are added to the audit timeline and shared with the researcher. Publication is a human action and cannot be triggered by an AI result alone.

## Route 2: Researcher Opts Out of TTO Review

The researcher’s opt-out is recorded with the disclosure snapshot and policy acceptance. The project moves directly to **Admin Review**.

The hosted AI still checks:

- Authenticity signals and internal consistency.
- Missing or conflicting claims.
- Evidence and citation availability.
- Duplicate or suspicious project content.
- Basic public-disclosure and confidentiality indicators.
- Completeness and project quality metrics.

Admin reviews the AI findings and other permitted sources, writes an Admin finding, and can accept or return the project. If the AI or Admin detects possible IP, ownership, sponsor, confidentiality, or public-disclosure risk, the system should recommend Route 1 and allow Admin to refer the case to TTO. The researcher’s opt-out must not prevent an institutional referral where policy requires it.

If Admin accepts Route 2, the project can be published only as the approved public summary. The system should display that the project bypassed the TTO workflow at researcher request and should not imply that the project received a TTO clearance.

## Access Levels

| Level | Examples | Audience |
|---|---|---|
| Public | Problem, high-level solution, applications, benefits, TRL, market need | Platform visitors after publication approval |
| Restricted | Selected technical details, evidence, collaboration requirements | Named approved partners and authorized staff |
| Confidential | Formulas, source code, detailed methods, unpublished results, drawings, strategy, sensitive data | Assigned TTO/legal reviewers and approved inventors |

New submissions and all attachments are private by default. The public listing is a separate, human-approved projection.

## Statuses

Use these simple statuses:

`DRAFT` -> `SUBMITTED` -> `ADMIN_REVIEW` -> `TTO_REVIEW` -> `PUBLISHED`, `RESTRICTED`, `CONFIDENTIAL_HOLD`, or `INFORMATION_REQUESTED`.

For Route 2:

`DRAFT` -> `SUBMITTED` -> `ADMIN_REVIEW` -> `ADMIN_ACCEPTED` -> `PUBLISHED` or `INFORMATION_REQUESTED`.

`AI_SCREENING` is an activity within review, not an approval status. A failed or uncertain AI run must be visible and must not publish the project.

## Partner Access After Publication

1. Partner views the public project summary.
2. Partner requests restricted information and gives a purpose.
3. TTO or authorized owner reviews the request and NDA requirement.
4. Approved users receive named, time-limited data-room access.
5. Every view, download, grant, expiry, and revocation is recorded.

An existing EOI or message may start the request, but an EOI must not itself grant access to confidential files.

## Implementation Mapping

| Existing component | Change |
|---|---|
| `pages/Dashboards.tsx` `ProjectFormModal` | Add Continue, IP questions, route selection, terms acceptance, and submission confirmation |
| `components/AdminDashboard.tsx` | Add Admin findings, source links, route handling, share-to-researcher/Super Admin actions, and TTO handoff |
| Researcher dashboard | Show route, status, findings shared with researcher, requests, and timeline |
| TTO workspace | Add institution-scoped queue, file/link uploads, findings, and review decision preparation |
| Super Admin workspace | Add final public/restricted/confidential decision and public-summary publication action |
| `server.ts` | Add authenticated submission, review, finding, file, link, share, and decision endpoints |
| `lib/aiSchemas.ts` | Validate structured AI findings, evidence status, and route recommendation |
| `services/storageService.ts` | Store attachments privately and issue scoped signed URLs |
| Supabase | Add disclosure, answers, versions, findings, files, links, reviews, decisions, and audit records |

## Minimum Data to Record

- Researcher and institution.
- Project and disclosure version.
- Route selected and whether the researcher opted out.
- IP answers and policy version accepted.
- Attached-file names, private paths, hashes, classifications, and scan status.
- AI model, prompt version, run status, findings, evidence references, and hashes.
- Admin findings and shared timestamp.
- TTO findings, uploaded files, links, reviewer, and review timestamp.
- Super Admin decision, reason, public projection version, and publication timestamp.
- Partner access requests, NDA state, expiry, revocation, and audit events.

## Rules That Must Not Be Violated

- AI does not make legal or patent decisions.
- No researcher, Admin, or AI result can directly publish confidential content.
- TTO review is institution-scoped.
- The opt-out is transparent, recorded, and reversible through referral.
- Unknown, failed, or conflicting checks are sent to human review.
- Public pages contain only the approved public projection.

This is an implementation design for product development. Institutional policy and qualified IP counsel determine the final disclosure, confidentiality, ownership, and publication rules.

## Implementation Breakdown

Keep the current application working and add the IP workflow as a separate feature boundary.

### Existing Files To Reuse

| File | Planned responsibility |
|---|---|
| `pages/Dashboards.tsx` | Keep the existing project form; open the new disclosure step after the project details are complete. |
| `components/AdminDashboard.tsx` | Keep platform administration; add a link to the Admin disclosure queue and findings panel. Do not put TTO legal decisions in the existing generic admin action. |
| `App.tsx` | Keep `HashRouter` and `/dashboard`; add dashboard tab state for disclosure and TTO workspaces rather than replacing routing. |
| `services/storageService.ts` | Keep current project upload behavior; call a dedicated IP document service for confidential files. |
| `lib/api.ts` | Keep the request timeout and credentials pattern; add a typed request wrapper only if needed. |
| `lib/auth.ts`, `lib/auth-client.ts` | Keep Better Auth as the application identity source and add institution/member authorization. |
| `lib/aiSchemas.ts` | Reuse server-side schema validation patterns for AI output. |
| `ai_decisions` | Extend provenance for IP screening without exposing raw confidential prompts to the browser. |

### New Frontend Files

Create these files before changing the large dashboard components:

- `components/disclosure/ProjectDisclosureWizard.tsx`: controls the project form, IP questions, policy acceptance, route choice, and submit state.
- `components/disclosure/DisclosureQuestions.tsx`: short Yes/No/Not sure questions.
- `components/disclosure/DisclosurePolicy.tsx`: versioned policy and terms from the UG RID IP policy.
- `components/disclosure/DisclosureStatus.tsx`: researcher timeline and sanitized findings.
- `components/disclosure/DisclosureFiles.tsx`: private attachment list and upload state.
- `components/tto/TtoReviewPanel.tsx`: TTO findings, links, uploads, requests, and sharing actions.
- `components/tto/TtoQueue.tsx`: institution-scoped TTO queue.
- `components/admin/DisclosureAdminReview.tsx`: Admin completeness review and Admin findings.
- `components/superadmin/PublicationDecision.tsx`: final public/restricted/confidential decision.
- `services/ipDisclosureService.ts`: typed calls for disclosures, findings, reviews, files, links, and decisions.
- `lib/ipSchemas.ts`: client-safe input schemas and enums; server schemas remain authoritative.
- `types/ip.ts`: IP-specific types instead of expanding `Project` with more optional fields.

### New Backend Files

The current `server.ts` is a single entry point. Keep it as the entry point but extract new logic into modules as the IP feature grows:

- `server/ip/ipRoutes.ts`: route registration.
- `server/ip/ipController.ts`: request/response handling only.
- `server/ip/ipService.ts`: state transitions, policy checks, and domain operations.
- `server/ip/ipAuthorization.ts`: institution, role, case, tier, and grant checks.
- `server/ip/ipAudit.ts`: append-only audit event creation.
- `server/ip/ipAi.ts`: queue submission and private model-worker client.
- `server/ip/ipStorage.ts`: R2/Supabase object operations and signed URL creation.
- `server/ip/ipEvidence.ts`: source links, citation metadata, and evidence status.

## Application Routing

Use the existing dashboard route and add tab-level routes first. Do not create a second authentication system.

| User | Route | Purpose |
|---|---|---|
| Researcher | `/dashboard?tab=disclosures` | Own disclosure list, new disclosure, status, shared findings, requests |
| Researcher | `/dashboard?tab=disclosure&id=:id` | Own case details and permitted files |
| Admin | `/dashboard?tab=admin-disclosures` | Completeness queue, Admin findings, return/accept actions |
| TTO/IP | `/dashboard?tab=tto-queue` | Institution-scoped TTO cases |
| TTO/IP | `/dashboard?tab=tto-review&id=:id` | Findings, sources, files, links, and handoff |
| Super Admin | `/dashboard?tab=publication-decisions` | Final platform publication decisions |
| Partner | `/projects/:id` | Public projection only |
| Partner | `/dashboard?tab=access-requests` | Named restricted-access requests |

The browser route is not an authorization boundary. Every loader and action must be authorized again on the server.

## API Endpoints

All endpoints use the existing same-origin Express gateway, Better Auth session cookie, CSRF/origin protection, Zod validation, request IDs, and object-level authorization.

| Method | Endpoint | Allowed actor | Action |
|---|---|---|---|
| `POST` | `/api/ip/disclosures` | Researcher | Create a private draft linked to a project |
| `GET` | `/api/ip/disclosures` | Researcher, Admin, TTO, Super Admin | Return a role- and institution-filtered queue |
| `GET` | `/api/ip/disclosures/:id` | Case members and authorized reviewers | Return a minimized case projection |
| `PATCH` | `/api/ip/disclosures/:id` | Researcher while editable; assigned reviewers for permitted fields | Update draft or requested corrections |
| `POST` | `/api/ip/disclosures/:id/submit` | Researcher | Freeze version, record policy acceptance, select route, and send to Admin |
| `POST` | `/api/ip/disclosures/:id/admin-accept` | Admin | Accept completeness and route to TTO or direct Admin path |
| `POST` | `/api/ip/disclosures/:id/admin-return` | Admin | Request information with a finding |
| `POST` | `/api/ip/disclosures/:id/ai-screen` | System or authorized reviewer | Queue private AI scouting/authenticity work |
| `GET` | `/api/ip/disclosures/:id/findings` | Researcher for shared findings; reviewers for full findings | Read sanitized or full findings by role |
| `POST` | `/api/ip/disclosures/:id/tto-findings` | TTO/IP officer | Add a finding, source link, or review note |
| `POST` | `/api/ip/disclosures/:id/tto-files` | TTO/IP officer | Upload a private review file |
| `POST` | `/api/ip/disclosures/:id/share-findings` | Admin or TTO | Share an approved finding with Researcher and Super Admin |
| `POST` | `/api/ip/disclosures/:id/publication-decision` | Super Admin or delegated TTO authority | Publish projection, restrict, hold, or request information |
| `POST` | `/api/ip/access-requests` | Authenticated partner | Request restricted access with purpose |
| `POST` | `/api/ip/access-requests/:id/decision` | TTO/authorized owner | Approve, deny, expire, or revoke access |
| `POST` | `/api/ip/files/:id/signed-url` | Authorized case member/grant holder | Issue a short-lived purpose-bound URL |
| `GET` | `/api/ip/audit/:id` | TTO, security auditor, authorized Super Admin | Return audit metadata without raw confidential content |

Rules:

- The client cannot submit `institution_id`, role, status, risk, owner, approval, or publication fields as authoritative values.
- Submit and decision endpoints require idempotency keys and a version number to prevent duplicate or stale transitions.
- Long AI, extraction, and evidence tasks return `202 Accepted` with a job id; they do not block the browser request.
- All decisions verify the current state, actor, institution, and case version in one transaction.
- The service role is server-only and is never used from browser code.

## Cloudflare Future Plan

Cloudflare is a future storage and edge migration for **all uploaded files**, not only IP/TTO files. It is not part of the current implementation.

For now, continue using the existing Supabase Storage adapter for project images, avatars, technical briefs, requested documents, news/media assets, and future IP/TTO files. Continue using Supabase/Postgres for users, projects, messages, profiles, permissions, workflow state, and audit metadata.

When the migration is approved, Cloudflare R2 can replace Supabase Storage for all objects using private buckets, opaque object-key prefixes, server-issued signed URLs, WAF/rate limits, upload scanning, and a controlled migration. Cloudflare has no drop-in managed PostgreSQL replacement for the current Better Auth/Postgres/RLS design; moving relational data to D1 would be a separate database rewrite.

Do not add R2 credentials, R2 SDK dependencies, Cloudflare routes, or migration code during the current IP workflow implementation. The current security requirements still apply to Supabase Storage: private-by-default objects, server-side authorization, signed URLs, upload validation, audit events, and no public URL for confidential content.

## Security Protocol

### Identity and authorization

- Better Auth session is resolved to one stable profile id.
- Every IP case has one institution id.
- TTO roles are assigned by an authorized institution administrator, never by a researcher.
- Admin, TTO, and Super Admin are separate permissions.
- Platform Super Admin access to confidential content is explicit, time-limited, and audited.
- Public project pages read only the approved public projection.

### Confidentiality

- Default new disclosure and attachments to confidential/private.
- Send the minimum necessary text to each AI task.
- Use the private hosted model for confidential content; external providers receive only approved redacted/public input.
- Do not put raw IP text in logs, analytics, email, browser local storage, URLs, embeddings, or error messages.
- Encrypt in transit and at rest; use managed keys and a separate secret store for production credentials.
- Maintain immutable submitted versions and hashes so later edits cannot silently change the reviewed material.

### Audit and monitoring

Record actor, institution, case, object, purpose, timestamp, request id, action, result hash, model/prompt version, and decision for upload, view, download, AI run, finding, share, role change, grant, revoke, and publication. Alert on repeated denied access, unusual downloads, failed AI queues, and public projection changes.

### Failure behavior

- AI timeout, malformed JSON, missing evidence, or model unavailability means `REVIEW_REQUIRED`.
- Storage scan failure means the file cannot be used for review or AI.
- Audit persistence failure blocks publication and access grants.
- Queue retries are bounded and idempotent.
- Never fail open to a public URL or fallback provider for confidential input.

## Current Fetch Error Before Implementation

The current `lib/api.ts` request wrapper passes literal HTTP methods, so the reported browser error, `"[object Promise] is not a valid HTTP method"`, is likely caused by a Better Auth request path or a stale `dist/assets` bundle. Before adding IP routes:

1. Rebuild with `npm run build` and restart the server so browser assets match source.
2. Clear the browser cache/service worker and test in a private window.
3. Inspect the failing Network request and identify whether it is `/api/auth/*` or an application API request.
4. If it is Better Auth, verify the installed `better-auth` version, client endpoint method, and `baseURL` are consistent with the server handler.
5. If it is an application request, add a runtime assertion in `requestWithTimeout` that rejects non-string methods before calling `fetch`.
6. Do not work around the error by weakening authentication or sending confidential data through a different client.

This defect should be resolved and covered by an integration test before the IP workflow is implemented.

## Implementation Status

Implemented. See `docs/API.md`, `docs/BACKEND.md`, `docs/FRONTEND.md`.

- Backend: draft/list/detail/patch/submit, admin accept/return, AI screen, send to TTO, findings + share (auto-advance to final review), links, files + 300s clean-only signed URLs, publication decisions, audit, access requests list/decisions (Phase 2).
- Frontend: researcher/student/partner/matches/messages overviews, researcher workspace + wizard + files, Admin queue, TTO queue/review, Super Admin decisions, access requests; nested `/dashboard/*` routes with legacy `?tab=` redirects.
- Dashboard: `Dashboards.tsx` is a shell; role pages live in `pages/dashboard/*`; admin has independent `/dashboard/admin/*` wrappers around `AdminDashboard`.
- Publication gate: new projects forced `Internal / Pending Review`; direct `Public/Published` mutations rejected; owner edits stay private; grandfathered public records preserved.
- DB: Phase 1 + Phase 2 additive migrations applied manually in Supabase.
- Hygiene (2026-09-04): `docs/` tracked again (removed blanket gitignore); `archive/` relocated out of repo; `constants.ts` → `lib/constants.ts` with dead exports removed; domain types canonical in `types/domain.ts`; `ProjectFormModal` extracted; `noUnusedLocals` enabled with ~170 dead imports/vars removed; dashboard pages lazy-loaded; SPA fallback added to `vercel.json`.
- Disclosure flow (2026-09-04): project-form button relabelled "Save & Continue to IP Questions"; wizard requires all answers and PATCHes them before submit (they were previously lost); TTO-routed drafts transition straight to `tto_review`; TTO share copy reads "Send to Admin for acceptance"; researcher post-submit confirmation panel added.
- Auth (2026-09-04): `ResetPassword` parses hash-based tokens (HashRouter fix); "Forgot access phrase" link added to `AdminLogin`; `scripts/reset-admin-password.mts` added for direct DB resets (bcrypt, `better_auth` schema).
- Verification: `npm run lint`, `npm test -- --run` (12 files / 68 tests), `npm run build` (2640 modules).
