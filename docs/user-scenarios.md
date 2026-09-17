# User Scenarios

## Student

- Lands on `/dashboard/overview` after onboarding.
- Sees collaboration calls, recommendations, bookmarks, and submitted applications.
- Can submit assistantship, scholarship, and lab workspace requests.
- Selecting a request category refreshes the default message template before submission.
- Uses Matches, Messages, Profile, and public project detail pages.
- Cannot access administrative, TTO, or project moderation routes.

## Industry Partner

- Lands on `/dashboard/overview` after onboarding.
- Sees the organization's own project portfolio and inquiry totals.
- Can create, filter, update, and close its own industry challenges.
- Does not fall back to displaying unrelated organizations' challenges when its own queue is empty.
- Uses Matches, Messages, Profile, project details, and challenge matching.

## Investor

- Lands on `/dashboard/overview` after onboarding.
- Sees published research opportunities, market-ready assets, bookmarks, and Hub Stream content.
- Can explore research and contact project owners through Matches and Messages.
- Does not see or invoke the Industry Partner challenge-posting workflow.
- Cannot create or moderate industry challenges.

## Shared Access Checks

- Student, Investor, and Industry/Partner roles can use the standard workspace only.
- Admin routes are limited to Admin and Super Admin roles.
- TTO roles use the separate TTO disclosure queue.
- Direct unknown admin URLs are rejected by the client dashboard guard.

## Release Verification Still Required

- Sign in with one real account for each role and exercise the flows above in the deployed environment.
- Verify database-backed empty, error, and success states with representative records.
- Confirm required IP disclosure migrations and production authentication variables are present before release.
