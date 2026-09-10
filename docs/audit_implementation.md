# Audit Implementation Record

This document records the user-scenario fixes implemented after the senior developer audit. It describes current behavior, not a future product proposal.

## Access And Routing

- Dashboard paths are guarded by the authenticated role in `pages/Dashboards.tsx` and `lib/dashboardRouting.ts`.
- Researchers can reach their disclosure workspace at `/dashboard/disclosures`.
- Admin and Super Admin retain Admin workspaces.
- TTO/IP users retain `/dashboard/overview` and the shared `/dashboard/tto/disclosures` queue only.
- TTO/IP access is global across the institutional queue. There is no department, institution, or named-reviewer assignment filter, by design.

## Disclosure Workflow

- `ip_disclosures` is the workflow source of truth.
- Invalid status/action combinations return `409` through the centralized transition service.
- TTO cases are active in `tto_review` and `tto_completed`; forwarded `super_admin_review` cases remain visible in the TTO queue for context after handoff.
- TTO can complete a review or send a reviewed case to Super Admin publication review.
- Super Admin final review is project-oriented and displays each `super_admin_review` case once with TTO/IP findings, AI findings, evidence files, timeline, and final decision controls.
- Status labels include `tto_completed` and `accepted` so persisted states are not shown as raw internal keys.

## Evidence Files

- Upload registration creates metadata with `scan_status: pending`.
- Pending files do not receive signed URLs.
- TTO/IP reviewers can manually approve a file through `POST /api/ip/files/:id/approve`.
- Approval changes the file to `clean`, enables the short-lived signed URL, and records `approve_file` in the IP audit event stream.
- This is a manual institutional review flow, not an antivirus scan.

## Assistant Reviewer

- Disclosure submission and the Admin manual screening action call the server-side LLM reviewer when `ASSISTANT_REVIEWER_KEY` is configured.
- `ASSISTANT_REVIEWER_MODEL` selects the model. `ASSISTANT_REVIEWER_BASE_URL` supports OpenAI-compatible providers and fine-tuned deployments.
- Gemini-compatible keys are supported directly; when the dedicated key is absent, the existing configured Gemini/Groq gateway is used.
- The LLM output is stored as preliminary internal findings and in the AI decision ledger with provider, model, and prompt version.
- Reviewer prompts include citations from researcher links, UG news, OpenAlex, Crossref, Google Patents, WIPO PATENTSCOPE, and IP portal references. Reasoning must cite those source IDs or the relevant disclosure answer keys.
- Citation URLs are clickable for reviewers and remain included when an Admin/TTO reviewer shares the finding with the researcher; private internal notes and files remain protected.
- Rules-based findings remain active as a deterministic safety net. No AI result grants legal clearance or changes publication status.

## Student And EOI Persistence

- Student profile updates use the authenticated server profile endpoint and upsert the role-specific `student_profiles` record.
- EOI creation validates `expressions_of_interest` and `requests` metrics.
- Project counters are incremented when an EOI is created for a project.
- EOI rows provide the recipient unread message count and conversation notification behavior.

## Admin Data Minimization

- Admin overview responses no longer include `ai_profile` data.
- TTO/IP overview requests receive project overview data but not the broad Admin profile or EOI collections.

## Verification

- `npm run lint`
- `npm test -- --run`: 68 tests passing across 12 files
- `npm run build`

## Explicit Non-Goals

- Assignment-level TTO scoping is not implemented because the institution uses a shared TTO/IP queue.
- External antivirus scanning is not implemented; manual TTO approval is the chosen evidence control.
