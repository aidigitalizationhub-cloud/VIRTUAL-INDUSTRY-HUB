# Dashboard UI Guidelines

This document defines the visual language for `/dashboard/overview` and the role-specific overview workspaces.

## Design Direction

The dashboard uses a clean research-operations workspace aesthetic:

- Warm, very light page background: `#f7f9fc`.
- University navy for headings and primary actions.
- Teal for active states, progress, and positive action.
- Amber or gold only for attention and pending states.
- Borders and surface contrast should do most of the visual separation.
- Shadows should remain soft and sparse, not define every card.
- Use whitespace and type scale to create hierarchy.

## Typography

Inter remains the primary typeface, with system fallbacks defined in `index.css`.

- Page and workspace headings: `20px` to `32px`, semibold or bold.
- Section headings: `18px` to `22px`, semibold.
- Body copy: `13px` to `15px`, regular or medium.
- Metadata: `11px` to `12px`, regular or medium.
- Use uppercase only for short labels such as status, role, or data category.
- Avoid large tracking values for normal headings and body text.
- Use line height and spacing instead of extra font weight to separate content.

## Shared Primitives

Shared dashboard styling belongs in:

- `components/dashboard/DashboardPrimitives.tsx`
- `components/dashboard/DashboardWidgets.tsx`
- `pages/Dashboards.tsx`

`StatCard` is for high-level metrics only. It should contain one value, one readable label, and an optional short trend. Do not place paragraphs or multiple actions inside it.

`SectionTitle` establishes the standard section heading and subtitle. Do not recreate section heading styles in role pages unless the section is a special hero or data table.

`UnifiedDashboardProfile` is the role workspace header. Its action must be the primary action for that role, for example `New Project Disclosure`, `Explore Research`, or `Post New Challenge`.

`HubStreamSidebar` and `BookmarkedProjectsList` use compact list rows. Avoid turning each item into a large elevated card.

## Layout Rules

- The dashboard content is centered at a maximum width of `1440px`.
- Use a main column and secondary column for content-heavy workspaces.
- Use `gap-5` or `gap-6` for primary layout rhythm.
- Use `gap-3` or `gap-4` inside lists and metric groups.
- Mobile layouts must remain single-column without horizontal scrolling.
- Sidebar modules should move below the main content on small screens.
- Keep one dominant action visible near the top of each role overview.
- On mobile, KPI groups should remain compact: three related metrics may share one row, with abbreviated labels and reduced icon/padding size.
- KPI cards should communicate a value quickly; do not give them enough height to compete with the primary workspace content on small screens.

## Role Priorities

### Researcher

Order content by work urgency:

1. Workspace identity and new disclosure action.
2. Disclosure metrics.
3. Active project or disclosure requiring attention.
4. Disclosure records.
5. Interaction hub and secondary activity.

Long workflow history, audit entries, and detailed upload controls should remain expandable or bounded. Do not allow timelines or interaction lists to determine unlimited page height.

### Student

Prioritize:

1. Explore research action.
2. Recommended collaboration opportunities.
3. Active applications and their statuses.
4. Saved projects and hub activity.

Empty states should explain what the user can do next and provide one relevant action where possible.

### Partner and Investor

Prioritize:

1. Post challenge or discovery action.
2. Active challenges and response activity.
3. Venture portfolio.
4. Watchlist and trending research.

Use project imagery selectively. List rows should carry most portfolio content so the page remains scannable.

### Matches

The Matches workspace is an action-oriented discovery page, not a generic card grid:

- Keep the page heading and purpose visible above the Challenges and Projects & People switcher.
- Match cards should use readable project or person names, a short explanation, and one clear primary action.
- Scores are supporting metadata and must not overpower the name or action.
- On mobile, action buttons may stack full width; descriptions should remain at least `14px` when they carry decision context.
- Proposal editing must remain usable inside a bounded, vertically scrollable modal on short screens.

### Admin

Admin pages may remain more data-dense than user dashboards. The visual priority should still be:

1. Review queues and alerts.
2. Pending decisions.
3. Operational metrics.
4. Historical tables and reports.

Do not force Admin tables into the lighter role-dashboard card pattern.

## Interaction Rules

- Hover states should clarify interactivity with border, text, or a small translation effect.
- Avoid animated pulses on persistent content except for an important live indicator.
- Preserve visible focus states for keyboard users.
- Use `prefers-reduced-motion` friendly transitions.
- Buttons should use sentence case unless they are short status labels.
- Expandable content must have a clear label and remain bounded when it can grow indefinitely.

## Data Integrity For Dashboard Widgets

- Watchlist data must come from `/api/bookmarks`, which scopes records to the authenticated server user. Do not build a watchlist from a global project list or trust a client-supplied user ID for ownership.
- Hub Stream data must come from `/api/projects/trending`. The server endpoint returns only `Public` projects with `Approved` or `Published` disclosure status.
- Trending order is based on persisted project engagement metrics, verified interaction counts, and a small recency boost. Do not use array order or the current user's private projects as a trending proxy.
- Project thumbnails must have a safe fallback when a stored or signed object is unavailable. A broken storage object must not collapse the layout or appear as a missing image icon.
- Bookmark and trending failures should fail closed to an empty state, not fall back to unrelated accounts or private project data.

## Verification Checklist

Before changing an overview page:

- Run `npm run dev` and inspect the authenticated role view at desktop and mobile widths.
- Check the first viewport for hierarchy, primary action, and readable type.
- Check empty, loading, and populated states.
- Check that long lists, timelines, and activity feeds do not create uncontrolled page growth.
- Run `npm run lint`.
- Run `npm test -- --run`.
- Run `npm run build`.
