# 08d — Document Authoring RBAC and Public Read-Only Safety

## Parent

Ticket 08 — Canonical Knowledge Base Documents and Direct Document Links

## Problem

Several Document surfaces exposed actions that did not match the actual authorization or product contract:

- Viewer users could see Create Document controls from category pages and could navigate directly to authoring routes even though the API rejected writes.
- The public Document page contained decorative security claims that were not backed by an approval or verification workflow.
- The public page exposed Share/Save controls with no implemented behavior.
- Authenticated Document detail included other dead actions such as Bookmark/Report Outdated.

## Contract

- ADMIN and EDITOR can create/edit Knowledge Documents.
- VIEWER is read-only across the Knowledge Base UI and direct authoring routes redirect to read-only Document surfaces.
- Backend role guards remain the security boundary even when UI controls are hidden.
- The public known-link page contains only truthful neutral read-only copy.
- The public page has no authenticated navigation, inventory controls, fake verification claims, or dead Save/Share actions.
- Copy Public Link is a real async action and reports clipboard failure instead of always claiming success.
- Anonymous access is limited to a known public Document and valid KB image path; category/list/recent/search enumeration stays authenticated.

## Implementation

- Viewer create controls removed from category and library authoring surfaces.
- Direct `/dashboard/docs/new` and `/dashboard/docs/:id/edit` routes redirect unauthorized users to read-only destinations.
- Public Document copy/security-decoration cleanup implemented.
- Authenticated Copy Public Link now awaits clipboard write and exposes success/error state.

## Verification

- Knowledge Base public/auth metadata contract tests pass.
- Frontend lint and TypeScript checks pass.
- `documents-v1-acceptance.spec.ts` compiles and covers Viewer read-only, anonymous known-link access, anonymous enumeration rejection, and public image access.

## Runtime gate

Runtime Playwright execution remains pending until the app stack is available without holding the Serena tunnel request open.
