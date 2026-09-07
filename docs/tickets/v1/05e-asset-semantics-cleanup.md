## Parent
Ticket 05 — Connect Hardware Assets to Application topology

## Goal
Apply the approved 05d domain decision without a broad schema rewrite.

## Required behavior
- Stop assigning `DEV` to new physical Assets when environment is unknown.
- Do not rewrite or erase existing legacy `Asset.environment` values during unrelated edits.
- Remove the record-level Asset environment control from the ordinary Asset dialog; authoritative environment comes from Application Environment / Component relationships.
- Render `AssetStatus` as operational lifecycle only:
  - ACTIVE -> Active
  - INACTIVE -> Inactive
  - MAINTENANCE -> Maintenance
  - DECOMMISSIONED -> Decommissioned
  - ARCHIVED -> Archived where relevant
- Never label ACTIVE/INACTIVE as Under MA/MA Expired.
- Warranty expiration remains a separate fact.

## Acceptance evidence
- Frontend lint/typecheck green.
- Asset create payload omits environment when no explicit migration/compatibility path requires it.
- Editing an Asset does not manufacture a DEV environment.
- UI tests/spec assertions use lifecycle wording, not MA wording.

## Out of scope
- Removing the legacy Prisma column.
- New MA/support-contract schema.
- Relationship-aware Application Environment filtering.
