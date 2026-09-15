# Admin UI Polish

Status: completed for the current production UI typography pass.
Scope: `components/AdminDashboard.tsx` sections, `DisclosureAdminReview`, `TtoQueue`/`TtoReviewPanel`, `PublicationDecision`, `DisclosurePages` frames + access requests, shared shell (`DashboardHeader`, `DashboardNavigation`, `DashboardWidgets`, `DashboardPrimitives`).
Locked decisions: decorative-only icon removal · Inter everywhere · admin + shared shell.

## 0. Design tokens
Create canonical class strings (new `components/dashboard/adminUi.ts` or extend `DashboardPrimitives.tsx`):
- Page title `text-2xl font-bold` · section `text-lg font-bold` · card title `text-sm font-bold` · body `text-sm` · meta/label `text-xs font-semibold tracking-wide` (replaces `text-[11px]`/`text-[10px]` one-offs) · caption `text-xs`.
- Eyebrow: `text-xs font-bold uppercase tracking-widest text-ug-teal` (replaces `tracking-[0.2em…0.4em]` sprawl).
- `font-mono` reserved for hashes/UIDs/timestamps/digests only.
- Radii: `rounded-xl` cards · `rounded-lg` inputs/buttons · `rounded-full` pills only.
- Z-index: header/sidebar 40 · dropdowns 50 · modals 60 (replaces `z-[1000…10000]`).

## 1. Typography (Inter everywhere)
- Implemented centralized `.type-*` typography tokens and legacy-size normalization in `index.css`; ordinary 10–13px UI copy now renders at the `text-xs` scale and non-display `font-extrabold` is reduced to bold.
- Added global `:focus-visible` treatment and dark-theme readability remaps alongside the typography foundation.
- Removed the legacy `font-serif` blocks from the Admin workflow and the inline serif presentation from project detail/profile copy.
- Strip `font-mono` from non-code content (emails `:1355,1462,1528`; labels/pills `:1010,1128,2114,2299,2320,2336`); keep in audit/digest views.
- Replace dead `text-gray-650`/`text-gray-750` (`:1784,1844,1885,1911,1948,1959,2015`) with `text-gray-600`/`700`.
- `font-extrabold` → `font-bold` except the page title; body copy to `text-sm`.
- Buttons to `text-xs font-bold` (remove `tracking-[0.25em]` micro-spacing in `ProjectFormModal.tsx:354,365,374`).

## 2. De-vibe chrome (functional icons stay)
- Delete glow blobs (`DashboardWidgets.tsx:45`, `ReportCenter.tsx:644`).
- Flatten decorative gradients to `bg-ug-navy` (avatar tile `:1344`, modal headers `:1517`, header logo `DashboardHeader.tsx:38`).
- Remove `animate-pulse`/`bounce`/`ping` from non-loading elements (`:859,885,2553,2908,2644`, `ACTIVE PROJECT` badge, header dot, notification bell); keep pulse in loading skeletons only.
- Remove `blur-3xl`/1000ms hover zooms; keep 150–300ms transitions.
- Eyebrow token for `uppercase` micro-labels; sentence-file changes elsewhere.

## 3. Per-page pass (behavior-preserving)
Overview/metrics, users, disclosures review, projects screener, news curator, audit log, decision log, TTO queue/review, publication decision, access requests — token sweep + button hierarchy (primary navy / secondary outline / danger).

## 4. Verify
`npm run lint` (icon removals must drop imports under `noUnusedLocals`), `npm test -- --run`, `npm run build`; visual check per admin route at desktop + mobile; grep for leftovers (`font-serif`, `blur-3xl`, non-skeleton `animate-pulse`, `gray-650`).

The remaining `font-mono` usage is intentionally limited to audit, UID, hash, digest, ciphertext, provider, and provenance values. Report/PDF font sizes remain scoped to generated output rather than normal UI typography.

Out of scope: `server.ts` split, Admin section extraction, nested routes, dark-mode completion, i18n consolidation.
