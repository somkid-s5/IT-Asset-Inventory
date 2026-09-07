## Parent
Ticket 05 — Connect Hardware Assets to Application topology

## Goal
Make Asset parent selection work across the full inventory rather than only the current paginated table response.

## Required behavior
- Parent picker searches independently from the Asset list page.
- Search results use a lightweight identity projection: id, assetId/name, type, with only justified disambiguation fields.
- An Asset cannot select itself.
- Backend validates the selected parent and prevents invalid hierarchy loops.
- Loading, no-result, and API-error states are visible.
- Existing parent remains selected during edit unless intentionally changed.
- Parent and children stay navigable from Asset detail.

## Acceptance evidence
- Backend tests cover valid parent, unknown parent, self-parent, and hierarchy-loop rejection.
- Playwright uses enough seeded Assets that the target parent is outside the first table page, then proves search, selection, save, reload, and relationship navigation.
- Existing Asset list pagination/search remains green.

## Out of scope
- General dependency graph.
- Port/interface topology.
- Application Component relationships.

## Blocked by
None. Reuse an existing permission-safe lookup contract if suitable instead of creating a duplicate endpoint.