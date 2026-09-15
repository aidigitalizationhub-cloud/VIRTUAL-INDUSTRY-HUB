# Frontend Documentation

## Stack

- React 19 + TypeScript strict, Vite 6, Tailwind 4, `motion/react`, `lucide-react`, `HashRouter`, i18next (EN/FR/Twi/Swahili), lazy routes + manual chunks (`vite.config.ts:22`).
- HTTP: `lib/api.ts:1` (`getJson/postJson/putJson/deleteJson`, 15s abort, `credentials: include`, server `{ error }` surfaced).
- Auth client: `lib/auth-client.ts:1` (`createAuthClient`, same-origin `baseURL`, `getAuthUser`, `useSession/signIn/signUp/signOut`).
- Supabase browser client: anon key only (`lib/supabase.ts:3`); writes go through Express, never service role.

## Routing

`App.tsx`:
`/`, `/projects`, `/projects/:id` (public projection only), `/researcher/:id`, `/products`, `/news`, `/privacy`, `/terms`, `/forgot-password`, `/verify-otp`, `/reset-password`, `/admin/login`, `/dashboard/*` (protected), `*` → `/`.

Canonical nested dashboard URLs (`lib/dashboardRouting.ts`):
- `/dashboard/overview`, `/dashboard/matches`, `/dashboard/messages`, `/dashboard/profile`
- `/dashboard/admin/overview|users|projects|news|audit`
- `/dashboard/admin/disclosures`, `/dashboard/tto/disclosures`, `/dashboard/access-requests`
- Researcher users also have the user-facing `/dashboard/disclosures` workspace directly below Overview in desktop and mobile navigation.
- Legacy `/dashboard?tab=...` redirects once to the canonical path; `/dashboard` redirects by role.

Extracted pages (`pages/dashboard/`):
`ResearcherOverviewPage`, `StudentOverviewPage`, `PartnerOverviewPage`, `MatchesPage`, `MessagesPage`, `DisclosurePages` (unified researcher/TTO/authenticity/access), `admin/Admin{Overview,Users,Projects,News,Audit}Page`.
All dashboard pages load via `React.lazy` + `Suspense` (`pages/Dashboards.tsx`); `Dashboards` chunk is ~74 KB, `AdminDashboard` ships as a separate on-demand chunk.
Shared chrome: `components/dashboard/{DashboardHeader,DashboardNavigation,DashboardPrimitives,DashboardWidgets,ProfileInsight,ProfileSettings,ProjectFormModal}`.
Shared helpers: `lib/messageUtils.ts` (`isRevealRequestMessage`), `lib/constants.ts` (previously root `constants.ts`; dead `LATEST_NEWS`/`MOCK_PROJECTS` removed), canonical domain types in `types/domain.ts` (root `types.ts` is a re-export shim).
`components/AdminDashboard.tsx` remains the implementation behind the admin route wrappers; disclosure review is handled by the unified IP workspaces.
`vercel.json` includes an SPA fallback rewrite plus the `/api/*` rewrite; `HashRouter` is retained deliberately (works on any static host).

## IP workspaces (new)

- `components/disclosure/ResearcherDisclosureWorkspace.tsx` — unified expandable project records with answers, route/status, AI findings, shared human findings, files, links, and timeline. Mounted under Researcher overview and `/dashboard/disclosures`.
- AI finding URLs are rendered as clickable citations. Findings are internal by default and become visible to researchers only after Admin/TTO sharing.
- `components/disclosure/ProjectDisclosureWizard.tsx` — all 8 answers required (`missingIpAnswers`), answers saved via PATCH, then route → policy → submit. TTO route lands directly in IP Office review; opt-out goes to Admin triage. Post-submit shows a confirmation panel with the next step instead of silently hiding the form.
- `components/disclosure/DisclosureQuestions.tsx` — `IP_QUESTIONS` yes/no/not_sure + free text (`lib/ipSchemas.ts:1`).
- `components/disclosure/DisclosurePolicy.tsx` — `IP_POLICY_TEXT`, versions `UG-RID-IP-v1.0` / `UG-RID-SUBMIT-v1.0`, unchecked checkbox required.
- `components/disclosure/DisclosureFiles.tsx` — uploads via `StorageService.uploadFile('projects')`, normalises to `bucket/path`, registers via `/api/ip/.../files`.
- `components/disclosure/DisclosureStatus.tsx` — legacy read-only status list, superseded by workspace but kept.
- Admin `/dashboard/admin/disclosures` is the unified expanded Disclosure workspace for TTO-routed and opt-out records.
- `components/tto/TtoQueue.tsx` + `TtoReviewPanel.tsx` — full-width TTO queue at `/dashboard/tto/disclosures`; each case opens on its own detail route at `/dashboard/tto/disclosures/:id` with answers, private files, AI findings, evidence links, manual findings, and researcher sharing.
- `components/disclosure/DisclosureQuestions.tsx` — motion-based one-question-at-a-time IP questionnaire with progress, automatic choice advance, Back navigation, text-question Continue actions, and structured contributor name/role entries.
- `pages/dashboard/DisclosurePages.tsx` — `IpQuestionsPage` intermediate route at `/dashboard/disclosures/:id/questions`; project creation saves the draft first and only the completed questionnaire returns the researcher to `/dashboard/disclosures`.
- TTO reviewers can manually approve pending files in `TtoReviewPanel`; approval is required before the signed-file action becomes available.
- The former Admin Disclosure Review and Publication Decision pages are no longer routed or shown in navigation.

## Services + types

- `services/ipDisclosureService.ts:1` — typed wrapper for every IP endpoint (create/list/get/submit/adminAccept/adminReturn/aiScreen/sendToTto/findings/addFinding/shareFinding/links/addLink/files/audit/decidePublication).
- `services/storageService.ts:54` — `uploadFile`, `signProjectUrls`, project CRUD with client-side sanitising (`requested_documents`, `disclosure_timeline`, `ai_verification` stripped for non-owners).
- `types/ip.ts:1` — `IpDisclosure/Finding/Link/Decision/Event/FileRecord`, statuses, routes.
- `lib/ipSchemas.ts:1` — `IP_QUESTIONS`, policy text/versions, `IP_STATUS_LABELS`.
- `types.ts:25` — legacy `DisclosureStatus`, `Project`, `UserRole` preserved.

## Project creation hook

`ProjectFormModal`: after `StorageService.saveProject`, new projects create an IP disclosure draft; Save & Continue navigates to the unified Disclosure workspace.

## UX rules enforced

- Private by default; public pages read approved projection only.
- `Not sure` recommends TTO route; opt-out banner states no legal clearance.
- AI text always labelled advisory.
- Terminal states (published/restricted/hold/rejected) have no further actions in UI.
- All mutations use toast feedback (`App.tsx:38` ToastContext), loaders on async actions, forms validate before submit.

## Styling / a11y / i18n

- Tailwind rounded-2xl cards, `ug-navy`/`ug-teal` tokens, responsive grids, keyboard-focusable buttons/inputs, labelled fields.
- `useTranslatedText` for async dictionary + `/api/translate` fallback; theme via `useSystemTheme` + `ThemeSwitcher`.

## Local verification

- Local test verification on 10 September 2026: `npm test -- --run` passed with 18 files / 100 tests; lint and build also pass on the modular server layout. Deployed/manual verification remains required.
- Manual: researcher submit → automatic Gemini/rules advisory screen → TTO review or opt-out Admin authenticity review → shared findings in the expanded Disclosure project record; expired signed URLs denied; unauthorised case access `403`.
## Translation conventions

- Use `t()` for short labels, navigation items, button text, statuses, and accessible labels.
- Use a translated component or `Trans` for sentences that contain markup or interpolation.
- Use `translationService` only for dynamic or AI-generated text; never use it as a replacement for static UI keys.
- English is the source key tree. The locale parity test prevents a locale from silently falling back because a key is missing.

The locale bundles are loaded asynchronously for French, Twi, and Swahili. `LanguageGate` in `App.tsx` holds the initial route until the selected bundle is ready, preventing an English-first flash. The dashboard header/navigation and disclosure/access-request surfaces are currently wired to the shared `dashboard` namespace. `src/i18n/locales.test.ts` enforces leaf-key parity across all four bundles.

`AppErrorBoundary` provides a localized recovery screen for render failures and logs the original error to the browser console for diagnosis.

The role overview surfaces now use the namespace for their primary profile actions, statistics, section headings, and empty states (`PartnerOverviewPage`, `StudentOverviewPage`, `ResearcherOverviewPage`). The messages surface uses the active locale for its main navigation, composer, search, empty state, and send action; message body content remains user-authored and is not rewritten. The TTO queue and review fallback states use the same namespace for their queue controls and states; TTO finding content remains reviewer-authored and is not rewritten.

Global `:focus-visible` styling provides a consistent keyboard focus indicator, and the dark theme remaps large navy surfaces and known disclosure metadata colors for readable contrast.
