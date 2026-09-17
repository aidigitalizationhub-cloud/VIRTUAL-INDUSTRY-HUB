# Mobile Compatibility

## Scope

The dashboard and public pages use a mobile-first layout through the shared shell. Content remains inside the viewport, dashboard content clears the fixed bottom navigation, and cards/forms collapse to one column at narrow widths.

## Responsive Changes

- Removed the duplicate mobile Home control from the dashboard header.
- Changed the dashboard Matches label from `My Matches` to `Matches`.
- Stacked collaborator actions on narrow screens so buttons remain readable and tappable.
- Reduced onboarding padding and heading scale on phones.
- Removed nested scrolling from onboarding on mobile; the page now owns the scroll position.
- Made the embedded onboarding progress indicator use flexible segments on small screens.
- Added viewport overflow protection for routes, media, controls, and disclosure records.
- Kept disclosure thumbnails visible on phones and added a reusable image fallback for unavailable project images.
- Added mobile-safe layouts for project evidence, matching cards, messages, and disclosure controls.

## Verification

Run from the repository root:

```text
npm run lint
npm test -- --run
npm run build
```

The responsive pass was verified through the TypeScript check, the full test suite, and the production build. For manual QA, test at approximately 320px, 375px, 414px, 768px, and desktop widths. Check Home, Projects, Project Detail, Matches, Messages, Profile, Onboarding, Disclosure, TTO review, and Admin pages.
