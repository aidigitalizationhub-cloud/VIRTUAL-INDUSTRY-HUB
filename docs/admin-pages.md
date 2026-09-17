# Admin Pages

## Route Map

All admin pages are rendered inside the protected `/dashboard/*` workspace. Admin and Super Admin roles are allowed to use the following canonical routes:

| Route | Purpose | UI source |
| --- | --- | --- |
| `/dashboard/admin/overview` | Platform metrics and engagement summary | `AdminDashboard` metrics tab |
| `/dashboard/admin/users` | User directory, role management, and exports | `AdminDashboard` users tab |
| `/dashboard/admin/projects` | Project screening, filtering, moderation, and withdrawal | `AdminDashboard` projects tab |
| `/dashboard/admin/disclosures` | Administrative disclosure review and evidence workflow | `ResearcherDisclosureWorkspace` admin mode |
| `/dashboard/admin/decisions` | Final human publication decisions | `PublicationDecision` |
| `/dashboard/admin/news` | News creation, source verification, AI scouting, and publishing | `AdminDashboard` news tab |
| `/dashboard/admin/audit` | Message, encryption, and offboarding audit views | `AdminDashboard` logs tab |

The admin sidebar links to every route above. Disclosure detail routes under `/dashboard/admin/disclosures/:id` are also allowed and are handled by the disclosure workspace.

## Access Rules

- Unauthenticated users are redirected to the public landing page.
- Admin and Super Admin users are redirected from `/dashboard` to `/dashboard/admin/overview`.
- TTO roles can access `/dashboard/tto/disclosures` and its detail pages, but not admin routes.
- Unknown admin route segments are rejected by the client route guard and redirected to the admin landing page.
- Server-side admin operations accept both `Admin` and `Super Admin`; the UI is not the authorization boundary.

## Verification Checklist

- Open every route directly and through the admin sidebar.
- Confirm the active sidebar item follows the URL after refresh.
- Confirm `/dashboard/admin/decisions` displays cases in `super_admin_review` and records a required written decision reason.
- Confirm non-admin users cannot access admin routes or admin APIs.
- Confirm empty, loading, error, and mobile states for each page.
