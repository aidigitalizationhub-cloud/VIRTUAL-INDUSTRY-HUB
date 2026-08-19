# UNIVERSITY OF GHANA

## UG VIRTUAL INDUSTRY HUB / VIRTUAL HUB

### SYSTEM DOCUMENTATION & TECHNICAL DESIGN SPECIFICATION

**Version:** 1.1.0  
**Prepared by:** Senior AI Engineering & Systems Architecture Team  
**Institution:** Institute of Applied Science and Technology (IAST), University of Ghana, Legon  
**Date:** August 2026  
**Document Owner:** Director of Technology Transfer & Research Commercialization

---

## 2. Document Control

### 2.1 Revision History

| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| **0.1.0** | 2024 | System Architecture Team | Initial system architecture & requirements draft |
| **0.9.0** | 2025 | Lead Frontend & Backend Engineers | Feature freeze, Gemini integration & cryptographic security specification |
| **1.0.0** | 2026 | IAST Systems Governance Committee | Production release documentation & enterprise operational sign-off |
| **1.1.0** | August 2026 | IAST Systems Governance Committee | Documentation realigned to the deployed codebase: Groq-primary AI provider, actual API surface, actual schema, RLS and security posture |

### 2.2 Review & Approval

| Role | Name | Signature / Verification | Date |
| :--- | :--- | :--- | :--- |
| **Project Lead** | Prof. G. Awandare | *Signed (Digital Verification)* | August 2026 |
| **Technical Lead** | Lead AI Architect, IAST | *Signed (Digital Verification)* | August 2026 |
| **Director of IAST** | Executive Director, IAST | *Approved* | August 2026 |
| **TTO Governance Officer** | Senior Tech Transfer Officer | *Approved* | August 2026 |

---

## 3. Table of Contents

1. [Cover Page](#1-cover-page)
2. [Document Control](#2-document-control)
3. [Table of Contents](#3-table-of-contents)
4. [Executive Summary](#4-executive-summary)
5. [Project Overview](#5-project-overview)
6. [Scope Definition](#6-scope-definition)
7. [Stakeholder Analysis](#7-stakeholder-analysis)
8. [User Roles and Permissions](#8-user-roles-and-permissions)
9. [Functional Modules](#9-functional-modules)
10. [System Architecture](#10-system-architecture)
11. [Technology Stack](#11-technology-stack)
12. [Data Model](#12-data-model)
13. [API Reference](#13-api-reference)
14. [AI & Matching Architecture](#14-ai-matching-architecture)
15. [Security Architecture](#15-security-architecture)
16. [Deployment](#16-deployment)
17. [Environment Configuration](#17-environment-configuration)
18. [Testing & Quality Assurance](#18-testing-quality-assurance)
19. [Operations & Maintenance](#19-operations-maintenance)
20. [Appendices](#20-appendices)

---

## 4. Executive Summary

The **UG Virtual Industry Hub** (repository: `VIRTUAL-UGJH-HUB`) is a full-stack platform deployed for the University of Ghana's Office of Research, Innovation, and Development (ORID) via the Institute of Applied Science and Technology (IAST). It connects **researchers**, **student innovators**, **industry partners**, **investors**, and **administrators** across three therapeutic verticals — **Diagnostics**, **Vaccines**, and **Pharmaceuticals**.

Key capabilities delivered by the system:

1. **Research disclosure pipeline** with TRL 1–9 stage tracking and upload of supporting documents.
2. **Expression of Interest (EOI)** submissions from partners/investors, routed through a controlled review flow.
3. **Hybrid AI matching** where deterministic, auditable local scoring is authoritative and an LLM enriches ranking with qualitative reasoning (Groq primary, Gemini fallback).
4. **AI Decision Provenance Ledger** recording every AI decision — provider, model, prompt version, timestamp — for auditability.
5. **AI News Scout** synchronizing vetted global biomedical sources into a searchable, AI-summarized feed.
6. **Industry Challenges** module letting partners publish challenges matched against researchers and projects.
7. **Role-based portals** (Researcher, Student, Partner, Investor, Admin) with tailored dashboards.
8. **Multilingual UI** (English, Français, Twi, Kiswahili) and light/dark theming.

Security is enforced at three layers: Supabase Row-Level Security (RLS) in the database, a server-side Node/Express API that holds all privileged keys, and hardened HTTP response headers on every request.

---

## 5. Project Overview

### 5.1 Background

Academic research produced at the University of Ghana is frequently disconnected from the commercial partners, investors, and talent who could scale it. The Virtual Industry Hub digitizes the technology-transfer pipeline so disclosures, EOIs, matching, and challenge responses are tracked in one governed system.

### 5.2 Vision

A single national innovation marketplace where UG research evidence, institutional partners, and investor capital meet under transparent, auditable AI assistance.

### 5.3 Mission

Provide secure, multilingual, role-based tools that accelerate disclosure-to-partnership workflows and produce machine-verifiable records of every decision.

### 5.4 Objectives & Success Metrics

| Objective | Metric |
|---|---|
| Accelerate disclosure-to-EOI | Median time from disclosure submission to first EOI |
| Match quality | AI match score ≥ 85 ("Highly Compatible") ratio on active pipelines |
| Auditability | 100% of AI decisions recorded in the provenance ledger |
| Reach | Daily active users across all five roles; multilingual adoption |

---

## 6. Scope Definition

### 6.1 In Scope

- Researcher disclosures and document uploads (`.txt`, `.doc`, `.docx`, ≤ 15 MB).
- Partner/investor EOI submission and admin review.
- AI chat assistant, AI profile extraction, AI news scout, AI matching — all provider-traceable.
- Industry challenges CRUD + challenge matching + submission tracking.
- Role-based dashboards, notifications, bookmarks.
- Localization (EN/FR/Twi/Swahili) and theming.
- Supabase schema provisioning and RLS enforcement.

### 6.2 Out of Scope

- Outbound email/notification delivery infrastructure (notifications are in-app).
- Real-time multi-party document co-editing.
- Payments, escrow, or licensing transactions.
- KMS-backed server-side message encryption (documented as a later-phase target; see §15).

---

## 7. Stakeholder Analysis

| Stakeholder | Interest | Primary Interface |
|---|---|---|
| UG Researchers | Publish disclosures, receive EOIs, join challenges | Researcher portal |
| Student innovators | Find labs, internships, funding signals | Student portal |
| Industry partners | Publish challenges, browse disclosures, submit EOIs | Partner portal |
| Investors | Pipeline discovery, EOI submission | Investor portal |
| TTO / Admin | Govern disclosures, review EOIs, audit AI decisions | Admin portal |

---

## 8. User Roles and Permissions

Authentication is delegated to **Supabase Auth** (email/password, OTP, password reset) from the client. Roles live on the `profiles` table and gate both UI and RLS.

| Role | `profiles.role` | Capabilities |
|---|---|---|
| Student | `student` | Browse public projects/news, apply to labs, submit EOIs |
| Researcher | `researcher` | Create/edit own disclosures, manage TRL, respond to EOIs, join challenges |
| Industry Partner | `industry_partner` | Publish challenges, browse disclosures, submit EOIs |
| Investor | `investor` | Browse pipelines, submit EOIs |
| Admin | `admin` | Elevate roles, review disclosures, approve EOIs, run extraction, view decision ledger |

- `get_user_role()` SQL function maps the authenticated Supabase JWT to a role; `is_admin()` gates admin-only tables and routes.
- The server authorizes admin endpoints via `requireRole('admin')` using a service-role client; role elevation is only possible through an existing admin session.

---

## 9. Functional Modules

### 9.1 Authentication & Authorization

- Supabase client-side auth (`lib/supabase.ts`); `AuthModal` handles login/register/reset.
- `AdminLogin` page for admin access; admin gating additionally enforced on the server.
- No passwords are stored by the application itself — hashing and session management are entirely Supabase's.

### 9.2 Industry Challenges

- `POST /api/industry-challenges` (partner role) publishes a challenge; `GET` lists them; `PUT/DELETE /:id` maintain them.
- `POST /api/challenge-matches/generate` runs matching against researchers/projects; matches are stored in `challenge_matches`.

### 9.3 AI Matching

- See §14. Flow: disclosure/profile → embeddings → `match_profiles` / `match_projects` RPCs → candidate pool → `/api/ai-match` hybrid ranking.

### 9.4 AI News Scout

- `POST /api/ai-scout/sync` (Groq-primary) pulls vetted global biomedical source lists (`UG_SOURCES` + `GLOBAL_ACCREDITED`), upserts into `news`, and records the decision. `force` flag requires admin.

### 9.5 Decision Provenance Ledger

- `GET/POST /api/ai-decisions` (admin). Every AI call writes `provider`, `model`, `prompt_version`, subject, and result summary into `ai_decisions`.

### 9.6 Document Upload & Extraction

- Client `uploadGuard` enforces size (15 MB), extension (`.txt`/`.doc`/`.docx`), and MIME whitelist; server repeats the check.
- `POST /api/admin/extract-document` (admin only) extracts text (mammoth/docx) and has Gemini produce structured JSON validated against zod schemas.

### 9.7 Dashboard Visualizations

- Hand-built metric cards, trend indicators, and charts (no charting dependency is used in production components; `recharts` is an unused dependency).

### 9.8 Notifications & Localization

- `NotificationCenter` surfaces in-app notifications tied to `interaction_logs`/saved-search matches.
- `LanguageSwitcher` loads translation bundles on demand via `loadLanguageAsync`.

---

## 10. System Architecture

```
┌────────────────────────── Browser ──────────────────────────┐
│ React 19 SPA (HashRouter)   components/   pages/  services/ │
│   Auth: Supabase JS client (anon key)                      │
└───────────────┬────────────────────────────────────────────┘
                │ REST (fetch via lib/api.ts postJson/getJson)
┌───────────────▼────────────────────────────────────────────┐
│ Node.js + Express 5 server (server.ts)                      │
│   • auth middleware → Supabase service-role client (RLS-free)│
│   • /api/health, /api/translate, /api/gemini/*,             │
│     /api/ai-*, /api/industry-challenges, /api/challenge-*,  │
│     /api/ai-decisions, /api/admin/extract-document          │
│   • security headers + CORS allowlist + zod validation      │
│   • throttling (e.g. /api/gemini/embed: 100 req/min/user)   │
└───────┬──────────────────────────────┬─────────────────────┘
        │                              │
┌───────▼───────────┐        ┌─────────▼──────────────────────┐
│ Supabase Postgres │        │ AI Providers                  │
│  pgvector (768-d) │        │  • Groq (PRIMARY)             │
│  RLS policies     │        │    openai/gpt-oss-120b        │
│  match_* RPCs     │        │  • Gemini (FALLBACK)          │
│  ai_decisions     │        │    gemini-3.6-flash family    │
└───────────────────┘        │  • Gemini embeddings          │
                             │    gemini-embedding-2-preview │
                             └───────────────────────────────┘
```

Dev mode: Vite middlewares served inside the Express app; production: `express.static` of the built app (or Vercel serverless export).

---

## 11. Technology Stack

### 11.1 Frontend

| Layer | Technology |
|---|---|
| Framework | React **19** (^19.2.3), TypeScript strict |
| Build | Vite 6, `@vitejs/plugin-react`, Tailwind CSS 4, `@tailwindcss/vite` |
| Routing | `react-router-dom` (HashRouter) |
| Animation/Icons | `motion`, `lucide-react` |
| i18n | `i18next`, `react-i18next`, `i18next-browser-languagedetector` |
| Client libs | `@supabase/supabase-js`, `jspdf`, `jspdf-autotable`, `docx`, `mammoth`, `pdfjs-dist` |

### 11.2 Backend

| Layer | Technology |
|---|---|
| Runtime | Node.js + Express **5** (^5.2.1), single `server.ts` |
| Dev runner / bundler | `tsx` (dev), esbuild (production bundle `dist/server.cjs`) |
| AI SDKs | `groq-sdk` (primary), `@google/genai` (fallback + embeddings) |
| Validation | `zod` request schemas (`lib/requestSchemas.ts`, `lib/aiSchemas.ts`) |
| Hosting | Any Node host; `0.0.0.0:3000`; Vercel serverless export supported |

### 11.3 Data & Auth

| Layer | Technology |
|---|---|
| Database | Supabase PostgreSQL 15+ with `pgvector` (768-dim vectors) |
| Auth | Supabase Auth (client-side) |
| Access control | RLS policies + `SECURITY DEFINER` matching functions |

---

## 12. Data Model

All schema is provisioned by `supabase_setup.sql`; `supabase_rls_verify.sql` asserts policy state.

### 12.1 Tables (setup order)

| # | Table | Purpose |
|---|---|---|
| 1 | `profiles` (pre-existing) | Users, roles, collaboration profile, semantic summary |
| 2 | `projects` (pre-existing) | Research disclosures, TRL stage, visibility flags |
| 3 | `eois` (pre-existing) | Expressions of interest linking partners/investors to projects |
| 4 | `account_deletions` (pre-existing) | GDPR-style account deletion requests |
| 5 | `student_profiles` | Student-specific attributes |
| 6 | `researcher_profiles` | Researcher-specific attributes |
| 7 | `investor_profiles` | Investor-specific attributes |
| 8 | `industry_profiles` | Industry partner attributes |
| 9 | `ai_decisions` | Provenance ledger (decision_type, provider, model, prompt_version, result) |
| 10 | `interaction_logs` | In-app interaction and notification feed |
| 11 | `bookmarks` | User-saved projects/news |
| 12 | `news` | Scout feed with `fts_doc` tsvector (GIN indexed) |
| 13 | `industry_challenges` | Partner-published challenges |
| 14 | `challenge_matches` | Researcher/project ↔ challenge matches |

### 12.2 Functions & Triggers

- `get_user_role()`, `is_admin()`, `is_reveal_approved()`, `can_access_project_file()`
- `match_profiles(query_embedding, match_threshold, match_count)` — vector similarity over profiles
- `match_projects(...)` — vector similarity over projects, **`SECURITY DEFINER`**, visibility enforced server-side
- Trigger `guard_challenge_match_scores` — constrains challenge match scores

### 12.3 Storage Buckets

- `projects` (private) — disclosure attachments, signed-URL access via `can_access_project_file`
- `avatars` (public) — user avatars

---

## 13. API Reference

All routes except `/api/health` require an Authorization header validated by `authenticateUser` against Supabase. Admin routes additionally require the `admin` role.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | — | Liveness (`{status:'ok', time}`) |
| POST | `/api/translate` | user | Text translation (Gemini) |
| POST | `/api/gemini/chat` | user | AI assistant chat (Groq-primary) |
| POST | `/api/gemini/embed` | user, throttled | Embeddings via `gemini-embedding-2-preview` (768-d) |
| POST | `/api/ai-profile` | user | Extract/refine AI profile (Groq-primary) |
| POST | `/api/ai-scout/sync` | user; `force` = admin | Scout feed sync + news upsert (Groq-primary) |
| POST | `/api/ai-match` | user | Hybrid match ranking (deterministic + LLM reasoning) |
| GET/POST | `/api/industry-challenges` | user / partner | List / create challenges |
| PUT/DELETE | `/api/industry-challenges/:id` | partner | Update / delete challenge |
| GET | `/api/challenge-matches` | user | List matches |
| POST | `/api/challenge-matches/generate` | user | Generate challenge matches |
| PUT | `/api/challenge-matches/:id` | user | Update a match record |
| GET/POST | `/api/ai-decisions` | admin | Read / write provenance ledger |
| POST | `/api/admin/extract-document` | admin | Document text extraction + AI structuring |

**There is no `/api/gemini/copywrite` endpoint and no `/api/auth/*` HTTP API** — authentication is performed client-side by the Supabase SDK.

---

## 14. AI & Matching Architecture

### 14.1 Provider Strategy

- **Primary:** Groq — model `openai/gpt-oss-120b` (override via `GROQ_MODEL`). Server-only key.
- **Fallback:** Gemini `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-flash-latest`, `gemini-3.1-flash-lite`.
- Helper `generateWithProviders` (server.ts) tries Groq then Gemini and returns `{provider, model, text}`; `generateWithFallback` handles Gemini-only paths (translate, extract).
- **Embeddings:** Gemini `gemini-embedding-2-preview` via `/api/gemini/embed` (Groq exposes no embeddings endpoint); client `ensureDimension` normalizes to 768.

### 14.2 Matching Pipeline (hybrid, auditable)

1. **Stage 1 — Dense retrieval:** profile/project text embedded to a 768-d vector; `match_profiles` / `match_projects` RPCs return top-20 cosine-similarity candidates (threshold 0.0).
2. **Stage 2 — Deterministic local scoring (authoritative):** `computeLocalMatchRankings` (lib/scoring.ts) computes a keyword-overlap score over a fixed domain keyword set plus a similarity bonus: `score = clamp(50, 98, round(similarity×80) + overlap×8)`. Labels: ≥85 *Highly Compatible*, ≥70 *Strategic Match*, else *Compatible Match*. This number **cannot be overridden by the LLM**.
3. **Stage 3 — LLM enrichment:** Groq-primary `generateWithProviders` produces JSON reasoning + alignment labels (validated against `matchRankingsSchema`); merged into the deterministic scores.
4. **Provenance:** every ranking writes a `match_ranking` row into `ai_decisions` (provider, model, prompt version `ugjh-match-rankings-v1`).
5. **Client fallback:** if the API fails, `MatchingService.rankMatches` replays the identical local keyword scorer and caches results in an in-memory Map keyed by summary + candidate ids.

### 14.3 AI Decision Provenance Ledger

Every AI interaction records:

- `decision_type` — `chat`, `profile_extraction`, `match_ranking`, `news_scouting`, `document_extraction`
- `provider` and `model` (the actual provider/model served)
- `prompt_version`
- `subject_id`, `result` summary, `review_status` (default `pending`)

---

## 15. Security Architecture

### 15.1 HTTP Hardening (server middleware)

| Header / Control | Value |
|---|---|
| CORS | Allowlist from `CORS_ORIGINS` env |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| HSTS | Enabled |
| CSP | Configured |
| `Permissions-Policy` | Restricted |
| OPTIONS preflight | Short-circuits (204) |

### 15.2 Secret Handling

- `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY` are **server-only**; the browser uses only `VITE_`-prefixed keys and the anon key.
- The server resolves `GEMINI_API_KEY || VITE_GEMINI_API_KEY` and `VITE_GROQ_API_KEY || GROQ_API_KEY` so hosted Vite builds keep working.

### 15.3 Database Security (RLS)

- Public select on approved public projects and synchronized news.
- Self-write on own profiles.
- Admin-only scope on `ai_decisions` (via `is_admin()`), role elevation, and approval states.
- `SECURITY DEFINER` matching functions enforce project visibility server-side; clients cannot bypass via direct RPC.
- `account_deletions` table records removal requests.

### 15.4 Input Validation & Uploads

- All request bodies validated with zod (`validateBody`).
- Upload guard: ≤ 15 MB, extension whitelist `.txt/.doc/.docx`, MIME whitelist — enforced client and server side.

### 15.5 Message/EOI Confidentiality

- Legacy payloads are decrypted with AES-256-GCM envelope decryption (`lib/cryptoService.ts`, `inspectMessageEnvelope` reports `AES-256-GCM (legacy)`).
- **KMS-backed server-side encryption replaces legacy client-side encryption in a later phase** — this is a declared design target, not a current capability.

---

## 16. Deployment

### 16.1 Build & Run

| Step | Command |
|---|---|
| Dev server | `npm run dev` → `0.0.0.0:3000` |
| Production build | `npm run build` (Vite static build + esbuild `dist/server.cjs`) |
| Run production | `npm start` (`node dist/server.cjs`) |

### 16.2 Hosting Notes

- Port is fixed at `3000`; set `CORS_ORIGINS` to the production origin.
- Vercel serverless export supported for the API; static assets served by `express.static` when not on Vercel.
- CI workflow runs on GitHub Actions (`.github/workflows/ci.yml` + `secret-scan.yml`).

---

## 17. Environment Configuration

Create `.env` from `.env.example`:

```env
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
GEMINI_API_KEY=
GROQ_API_KEY=          # server-only; used for profile extraction and matching
GROQ_MODEL=openai/gpt-oss-120b

# CORS allowlist (comma-separated origins)
CORS_ORIGINS=
```

---

## 18. Testing & Quality Assurance

| Check | Command | Status |
|---|---|---|
| Type check | `npm run lint` (`tsc --noEmit`) | Passing |
| Unit tests | `npm run test` (`vitest run`) | 27 passing |
| Build | `npm run build` | Passing (esbuild warnings only) |

Test files: `lib/aiSchemas.test.ts`, `lib/rlsPolicies.test.ts`, `lib/scoring.test.ts`, `lib/uploadGuard.test.ts`.

---

## 19. Operations & Maintenance

- **Monitoring:** `/api/health` liveness; Supabase console for DB metrics.
- **AI cost/governance:** provenance ledger is the source of truth for provider usage; `GROQ_MODEL` can be switched without redeployment.
- **Housekeeping:** review `ai_decisions.review_status` for flagged outputs; prune scout `news` via sync policy.
- **Recovery:** DB restored from Supabase point-in-time backup; environment secrets rotate via hosting console.

---

## 20. Appendices

### A. Source of truth files

| File | Contents |
|---|---|
| `server.ts` | All routes, providers, middleware |
| `supabase_setup.sql` / `supabase_rls_verify.sql` | Schema, RLS, functions |
| `lib/scoring.ts`, `lib/aiSchemas.ts`, `lib/uploadGuard.ts` | Matching math, AI schemas, upload rules |
| `public/RAG_IMPLEMENTATION.md` | RAG pipeline deep-dive |

### B. Realized vs planned

| Capability | Status |
|---|---|
| Groq-primary / Gemini-fallback AI | **Realized** |
| AI decision provenance ledger | **Realized** |
| Industry challenges + matching | **Realized** |
| Multilingual UI (EN/FR/Twi/Sw) | **Realized** |
| pgvector 768-d hybrid matching | **Realized** |
| KMS-backed server-side message encryption | **Planned** |
| Outbound email/SMS notifications | **Planned** |
