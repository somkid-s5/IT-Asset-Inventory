## Parent

Ticket 05 — Connect Hardware Assets to Application topology

## Goal

Turn the Asset list from a demo-scale search table into an operational inventory view by exposing server-side filters the API already supports and whose domain semantics are approved.

## Vertical slice

Existing API filters -> URL/query state -> filter controls -> list/no-result/reset states -> focused API test -> E2E.

## Required behavior

- Expose user-facing server-side filters for:
  - owner
  - location
- Do **not** expose the legacy free-text `Asset.environment` field as a primary filter. Decision 05d establishes Application Environment relationships as authoritative for physical Assets.
- Keep type and archived behavior working.
- Search, type, archived, owner, and location state are reflected in the URL so a useful inventory view can be bookmarked/shared and survives reload.
- Active owner/location filters are visible and can be cleared individually or reset together.
- Filtering remains server-side and compatible with pagination/sorting/search.
- Changing a filter resets to page 1 without losing unrelated valid filter state.
- No-result state distinguishes an empty inventory from a filtered result with zero matches.
- Do not add client-only filtering over one page of data.

## Acceptance evidence

- API/service focused tests cover owner/location combined with q/type/status/paging.
- Development seed contains realistic owner and location values for repeatable filter evidence.
- Playwright verifies owner/location filter application, URL persistence, reload persistence, combined filters, reset, and no-result behavior with seeded records.
- Existing Asset list sorting/pagination/search tests remain green.

## Out of scope

- Relationship-aware Application Environment filtering; that belongs with Application topology.
- Changing Asset status semantics.
- New Asset relationship models.
- Visual-system redesign.

## Blocked by

05d Environment/domain decision — resolved 2026-09-06.