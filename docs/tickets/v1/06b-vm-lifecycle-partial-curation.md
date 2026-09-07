## Parent
Ticket 06 — Complete vCenter and VM Inventory lifecycle

## Goal
Separate human curation from synchronization/lifecycle state so editing context cannot manufacture a false sync or ACTIVE state.

## Problem found by audit
`updateInventory()` currently treats an optional draft as a full replacement for several curated fields, defaults omitted lifecycle state to ACTIVE, writes user-supplied disks, and sets `lastSyncAt` on human edits. Restoring an archived VM always returns ACTIVE even if it was previously missing from vCenter.

## Required behavior
- Update is patch-safe: omitted curated fields keep their current values; explicitly empty values may clear where the field permits it.
- Human curation cannot write vCenter-owned disk/fact fields.
- Human curation never changes `lastSyncAt` or `syncState`.
- Human curation does not change lifecycle state unless a dedicated lifecycle action does so.
- Archive changes only lifecycle state and preserves every relation/context record.
- Restore returns `DELETED_IN_VCENTER` when the record is still known as missing from source; otherwise ACTIVE.
- Promoting a discovery without Application context remains allowed and results in Needs Context rather than rejection.

## Acceptance evidence
- Partial update test proves owner-only edit preserves environment/businessUnit/serviceRole/criticality/notes/guest accounts/component links and source facts.
- Partial update test proves `lastSyncAt`, `syncState`, and lifecycle are unchanged.
- Restore test covers both synced and missing-from-source records.
- Promotion test proves zero Application links is accepted and produces Needs Context when curated context is incomplete.
