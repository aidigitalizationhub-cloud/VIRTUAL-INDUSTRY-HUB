# Documentation Index

Current project documentation lives in this `docs/` folder.

IP disclosure is implemented in code + additive SQL migrations, not design-only.

## Current Docs

- `README.md` — project overview, setup, stack, scripts, and operational notes.
- `PROJECT_DOCUMENTATION.md` — system documentation and technical design specification.
- `RAG_IMPLEMENTATION.md` — embedding, vector retrieval, deterministic scoring, and LLM enrichment pipeline.
- `API.md` — complete REST reference: auth, profiles, projects, storage, disclosure workspace, findings/links/files, access requests, matches/EOI/challenges/AI.
- `BACKEND.md` — Express architecture, Better Auth, middleware, `server/ip/*` domain services, data model, RLS, storage/signed URLs, AI provenance, errors, deployment.
- `FRONTEND.md` — React/Vite routing, dashboard tabs, IP workspaces, services, types, project-creation hook, UX rules, verification.
- `database/` — Supabase SQL setup, RLS verification, security patch, and Better Auth migration scripts.
- `implementation.md` — single practical IP disclosure, Admin, TTO, access, and implementation design.
- `ip_disclosure_workflow.md` — authoritative researcher, TTO/IP, opt-out Admin, AI, findings, and privacy workflow.
- `audit_implementation.md` — implemented audit fixes, access model, persistence behavior, verification, and remaining non-goals.
- `PRODUCTION_REMEDIATION.md` — required production migration order, environment/deployment gates, security limitations, and verification checklist.
- `ip-workflow-simulator.html` — standalone browser simulation of the researcher, Admin, and TTO workflow.

- `database/ip_disclosure_phase1.sql` — additive Phase 1 IP tables (disclosures, events, findings, links, decisions, files) + RLS; run manually first.
- `database/ip_disclosure_phase2.sql` — additive Phase 2 access-request table; run after Phase 1.
- `database/ip_disclosure_phase3.sql` — adds the explicit `tto_completed` handoff status; run after Phase 1.

## Archive

- `archive/` was relocated outside the repository (2026-09-04) to keep binaries, PRDs, and prompt history out of git. Do not re-add office binaries or `.txt` env files to the repo.

## Current Verification State

- Local verification run on 10 September 2026: `npm test -- --run` passed with 18 files / 100 Vitest tests; `npm run lint` and `npm run build` also pass on the modular server layout.
- These are local source checks, not evidence of a deployed production migration, live Supabase RLS verification, or multi-instance rate-limit behavior.

## Dashboard Decomposition

- `pages/Dashboards.tsx` is now a route shell; role overviews live in `pages/dashboard/{ResearcherOverviewPage,StudentOverviewPage,PartnerOverviewPage,MatchesPage,MessagesPage,DisclosurePages,admin/*}`.
- Shared UI lives in `components/dashboard/*`; toasts live in `contexts/ToastContext.tsx`.
- Admin URLs are independent (`/dashboard/admin/*`); unified disclosures, TTO/IP review, authenticity review, and access have dedicated guarded pages.
- `components/AdminDashboard.tsx` is retained as the implementation behind admin wrappers pending section-level extraction.
