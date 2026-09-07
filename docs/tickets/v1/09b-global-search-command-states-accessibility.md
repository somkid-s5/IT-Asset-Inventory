# 09b — Global Search Command States and Accessibility

## Parent

Ticket 09 — Deliver Global Search Command Palette

## Problem

The palette had a shared Command surface but treated request failure as an empty result, had no explicit loading state, and retained stale queries after closing. That made network problems indistinguishable from valid no-result searches and weakened keyboard/screen-reader behavior.

## Contract

- Pointer activation and `Ctrl+K` open the same palette.
- The search input receives focus when the palette opens.
- Escape closes through the shared Dialog/Command behavior.
- Closing clears the previous query so the next search starts cleanly.
- Loading is exposed as a polite live status.
- API failure is exposed as an alert with an explicit retry action that preserves the typed query.
- Valid no-result state is distinct from loading/error.
- Result list has an accessible label and grouped headings.
- Selecting a result closes the palette before navigation.

## Implementation

- Extended the shared `CommandDialog` with an explicit `shouldFilter` pass-through for server-authoritative search.
- Added `Searching inventory…`, `Search unavailable`, retry, no-result, auto-focus, and query-reset behavior to `GlobalSearch`.
- Kept desktop and compact/mobile topbar entry points on the same component and command state.

## Verification gate

Frontend lint/TypeScript and Global Search Playwright compile/list must pass; runtime desktop/tablet/mobile accessibility behavior remains an environment-dependent acceptance gate.
