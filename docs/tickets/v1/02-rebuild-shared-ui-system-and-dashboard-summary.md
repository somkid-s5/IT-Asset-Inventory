## Parent

#4 — Spec: V1 internal infrastructure inventory

## What to build

Deliver the shared application shell and frozen UI templates through a rebuilt Dashboard whose first visible section provides clear inventory summary counts in a readable, consistent Light and Dark interface.

## Acceptance criteria

- [ ] The application shell provides consistent Sidebar, Topbar, page width, breadcrumbs, actions, and responsive navigation.
- [ ] Shared Dashboard, List, Detail, and Dialog templates define spacing, typography, status, loading, empty, error, confirmation, and destructive-action patterns.
- [ ] The Dashboard shows active Application, Asset, VM, and Database summary cards before any work queue.
- [ ] Each summary card navigates to the corresponding active inventory view.
- [ ] Light is the default theme, explicit preference persists, and both Light and Dark meet contrast and focus requirements.
- [ ] Product-controlled interface copy on the migrated surface is consistently English.
- [ ] Desktop and Tablet retain complete actions; Mobile provides a clear summary and navigation without horizontal page overflow.
- [ ] Superseded Dashboard and shell styling are removed rather than left active behind the new composition.
- [ ] Browser tests verify theme persistence, keyboard navigation, responsive shell behavior, and summary navigation.

## Blocked by

- #5 — V1-01: Establish a green implementation baseline.
