# UG Virtual Industry Hub

Welcome to the **University of Ghana (UG) Virtual Industry Hub** — a full-stack platform connecting academic researchers, student innovators, industry partners, investors, and administrators to foster collaborative research and commercialization.

It bridges scientific discovery at the **Legon Campus** with real-world market adoption across **Diagnostics**, **Vaccines**, and **Pharmaceuticals**.

---

## Key Functional Modules

1. **Research Disclosure Pipeline (Researchers)**
   - Draft, structure, and submit academic innovations.
   - Track progress on the standardized **Technology Readiness Level (TRL 1–9)** scale.
   - Upload technical publications and supplemental documents (`.txt`, `.doc`, `.docx`, ≤15MB, server-validated).

2. **AI-Powered Intelligence Assistant, Scout & Decision Ledger**
   - **Legon Research Assistant**: Context-aware AI chat for Diagnostics / Vaccines / Pharma questions with history-aware reasoning.
   - **AI News Scout**: Synchronizes vetted global biomedical news sources into a searchable feed with AI-generated summaries.
   - **AI Decision Provenance Ledger**: Every AI decision (chat, profile extraction, matching, scouting) is recorded with provider, model, and prompt version for auditability.

3. **Dynamic Role Portals**
   - **Researcher**: disclosures, requested edits, AI collaboration suggestions, interactions.
   - **Student**: lab projects, internship matching, research career directions.
   - **Partner / Investor**: filterable pipelines, market-ready developments, Expression of Interest (EOI) submissions.
   - **Admin / Director**: system metrics, role controls, disclosure review, decision logs.

4. **Semantic Similarity Analysis & Partner Matching**
   - Hybrid matching: deterministic local keyword/similarity scoring is **authoritative**; the LLM supplies only qualitative reasoning and alignment labels.
   - Graceful fallbacks keep matching working in restricted-key environments.

5. **Industry Challenges & Challenge Matching**
   - Partners publish industry challenges; the system matches them to relevant researchers/projects and tracks submissions.

6. **Localization & Theming**
   - Multilingual UI: **English, Français, Twi, Kiswahili** (lazy-loaded bundles).
   - Light/dark theme switching.

---

## Technological Stack

- **Frontend**: React 19 + TypeScript (strict), Vite 6, Tailwind CSS 4, `motion`, `lucide-react`, React Router (HashRouter), i18next.
- **Backend**: Node.js + Express 5 (single-file `server.ts`; production bundle via esbuild).
- **Database / Auth**: Supabase (PostgreSQL + `pgvector` + Row-Level Security). Auth is **Supabase client-side** (email/password, OTP, password reset).
- **AI Orchestration**: `groq-sdk` is the **primary** provider (default model `openai/gpt-oss-120b`); `@google/genai` is the fallback (`gemini-3.6-flash` family). Server-side embeddings use Gemini `gemini-embedding-2-preview` (768-d) — **Groq has no embeddings endpoint**.

### NPM Scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `tsx server.ts` | Dev server, binds `0.0.0.0:3000` |
| `build` | `vite build` + esbuild bundle | Static app + `dist/server.cjs` |
| `start` | `node dist/server.cjs` | Run production bundle |
| `preview` | `vite preview` | Preview static build |
| `lint` | `tsc --noEmit` | Type check |
| `test` | `vitest run` | Unit tests (27 passing) |

---

## Environment Configuration

Create a `.env` file at the project root (see `.env.example`):

```env
# Supabase
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-only; bypasses RLS

# AI keys
GEMINI_API_KEY=your-gemini-api-key
GROQ_API_KEY=your-groq-api-key                    # server-only; used for profile extraction and matching
GROQ_MODEL=openai/gpt-oss-120b

# CORS allowlist (comma-separated)
CORS_ORIGINS=http://localhost:3000
```

---

## How to Get Started

1. **Database setup** — run `supabase_setup.sql` in the Supabase SQL editor, then validate with `supabase_rls_verify.sql`. This creates `profiles`, `projects`, `eois`, `student_profiles`, `researcher_profiles`, `investor_profiles`, `industry_profiles`, `ai_decisions`, `interaction_logs`, `bookmarks`, `news`, `industry_challenges`, `challenge_matches`, and the `pgvector`/matching functions.
2. **Install** — `npm install`
3. **Run locally** — `npm run dev` → server binds to `0.0.0.0:3000`
4. **Production build** — `npm run build` then `npm start`

---

## Security

- **Row-Level Security**: public select on approved public projects/news; self-write on own profiles; admin-only scopes; `ai_decisions` read/write restricted to admins; `SECURITY DEFINER` matching functions enforce visibility server-side.
- **Server-side secret handling**: service-role and Groq keys are never exposed to the browser; the browser uses anon key + `VITE_`-prefixed keys only.
- **HTTP hardening**: CORS allowlist, `X-Content-Type-Options`, `X-Frame-Options: DENY`, HSTS, CSP, and Permissions-Policy headers on all responses.
- **Upload validation**: extension + MIME + size whitelist enforced on the server.

---

*Designed and engineered in alignment with the University of Ghana Office of Research, Innovation, and Development (ORID) directives.*
