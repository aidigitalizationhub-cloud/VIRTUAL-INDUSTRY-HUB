# IP Disclosure Workflow

## Purpose

The disclosure workflow keeps every project in one researcher-facing Disclosure page. A project remains visible there whether it was reviewed by the TTO/IP Office or used the TTO/IP opt-out route.

AI screening is advisory only. It never grants legal clearance, approves publication, rejects a project, or changes project visibility.

## Workflow

1. The researcher creates a project and completes every IP question.
2. The researcher selects either `tto_review` or `tto_opt_out` and accepts the current policies.
3. The server saves the answers and automatically creates advisory AI findings.
4. TTO-routed records enter the TTO/IP Office queue; opt-out records go directly to Admin -> Disclosure.
5. Automatic AI screening creates advisory findings for both routes.
6. Reviewers can inspect the project, answers, private files, links, AI findings, and audit timeline.
7. TTO completes TTO-routed reviews and sends them to the Super Admin final publication review. Admin can add authenticity findings to opt-out records directly in Disclosure.
8. Super Admin reviews the project summary, researcher answers, AI advisory findings, TTO/IP Office findings, evidence files, and audit timeline in `PublicationDecision`.
9. Super Admin records the final platform decision: publish, restrict, hold confidential, request researcher information, or reject.
10. The researcher sees AI and shared human findings in the expanded project record on the researcher Disclosure page.

The IP questionnaire is presented on the intermediate `/dashboard/disclosures/:id/questions` route after the project draft is saved. One question appears at a time with animated progress; choice answers advance automatically, Back remains available, and text questions use Continue so typing is not interrupted. Contributors are entered as separate full-name and role fields and stored as readable newline-separated entries in the private disclosure answer record. Only successful questionnaire submission returns the researcher to `/dashboard/disclosures`.

## Unified Disclosure Page

The page is project-oriented rather than ID-oriented. Each expandable project record contains:

- Project summary, department, and research area.
- Current disclosure status and selected route.
- All submitted IP question answers.
- AI advisory findings, with severity and source labels.
- TTO/IP Office or Admin findings shared with the researcher.
- Private file metadata and signed links for clean files.
- Supporting evidence links.
- Recent workflow events.

Internal findings remain hidden from researchers until a reviewer shares them as `shared_researcher`.

## TTO/IP Office Queue

The TTO queue contains records routed to TTO/IP review and retains forwarded records as read-only context after they reach `super_admin_review`. Reviewers can:

- Inspect the complete project record.
- Open files only through authorized, short-lived signed URLs.
- Review AI findings as advisory evidence.
- Add manual findings and supporting links.
- Share selected findings with the researcher.
- Manually approve uploaded files after review. Files remain `pending` and cannot receive signed URLs until approved; approval is recorded in the IP audit events.

The current queue is a shared institutional TTO/IP queue. It is intentionally not partitioned by department, institution, or named reviewer assignment.

## Super Admin Final Review

`super_admin_review` records are shown only in the `PublicationDecision` workspace. They are not repeated in the general Admin disclosure workspace. Each project is rendered once with its summary, answers, AI advisory findings, TTO/IP Office findings, private evidence files, review timeline, supporting links, and a required finding/review message before the final decision buttons are enabled.

The TTO/IP Office supplies specialist findings and evidence; the Super Admin makes the platform publication decision. AI findings remain advisory and never grant legal clearance. Pending files remain protected until an authorized reviewer approves them, after which they can be opened through a short-lived signed URL.

## Opt-Out Handling

Opt-out records bypass TTO/IP review but do not bypass controls. They appear directly in the Admin Disclosure page after automatic AI authenticity screening. Admin can inspect the complete record, rerun the check from the expanded record, and add or share manual findings.

## AI Safety

Gemini, if enabled, must be called server-side. The API key must never be exposed to browser code. The deterministic screening rules remain a safe fallback when Gemini is unavailable. Every result must be labelled advisory and should be recorded with its provider, model, prompt version, input/output hashes, and associated finding IDs.

## Evidence-Backed Reasoning

The assistant reviewer receives a bounded evidence packet containing researcher-provided publication/patent links, local UG news matches, OpenAlex and Crossref scholarly records, and public Google Patents, WIPO PATENTSCOPE, and IP portal search references. Each source receives a stable citation ID such as `[S1]` or `[P1]`.

The reviewer must return a summary, recommendation, reasoning items, confidence, and required actions. Each reasoning item must cite source IDs or disclosure answer keys and explain why the evidence matters. Missing or unavailable evidence must be stated explicitly. The model must not determine inventorship, claim that rights are forfeited, or issue legal or publication clearance.

Source URLs are rendered as links in reviewer findings. Findings remain internal until an Admin or TTO reviewer shares them with the researcher. Shared findings may include public scholarly, patent, WIPO, IP Office, and news citations; internal notes and private files remain restricted.

## Source Of Truth

`ip_disclosures` is the authoritative workflow record. `ip_disclosure_findings`, `ip_disclosure_files`, `ip_disclosure_links`, and `ip_disclosure_events` provide the review record. Legacy project disclosure fields must not be used to drive reviewer transitions.

## Removed Workflow Concepts

The unified workflow does not use a separate Authenticity Review page. The Admin Disclosure workspace handles triage and opt-out review, while `PublicationDecision` is the single project-oriented final review workspace for `super_admin_review` records.

## Related Operational Behavior

- Dashboard routes are guarded by the authenticated role. TTO/IP users can access the shared overview and TTO/IP queue, but not Admin-only workspaces.
- TTO/IP queue rows open individual disclosure detail pages at `/dashboard/tto/disclosures/:id`; the queue is not an inline review panel.
- Researcher disclosure navigation is available at `/dashboard/disclosures`.
- Student profile updates use the authenticated `/api/profile/update` endpoint so education, program, availability, and interests persist server-side.
- EOI submissions increment the selected project metric (`expressions_of_interest` or `requests`) and appear in the recipient's unread message count.
