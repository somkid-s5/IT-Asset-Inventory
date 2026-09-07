## Parent
Ticket 05 — Connect Hardware Assets to Application topology

## Goal
Enforce the Ticket 05 identity rule that optional Asset ID and Serial Number are unique when present, with migration-safe and user-readable behavior.

## Current defect
- `Asset.assetId` is unique.
- `Asset.sn` is nullable but not unique.
- Blank strings can be stored by non-UI callers unless normalized.

## Required behavior
- `sn` has a database unique constraint while allowing multiple NULL values.
- Empty/whitespace Asset ID and Serial Number normalize to NULL/absent rather than becoming duplicate pseudo-identifiers.
- Create/update rejects a duplicate Asset ID or Serial Number with a readable validation error before relying on the database exception.
- Migration refuses to create the unique index if non-blank duplicate serials already exist; it must not silently delete or rewrite real serial values.
- Existing Asset CRUD behavior remains compatible.

## Acceptance evidence
- Prisma schema/migration contains the unique constraint and deterministic blank normalization.
- Focused service tests cover duplicate Asset ID, duplicate Serial Number, current-record update, and blank values.
- Backend build/lint and Asset regression suite remain green.

## Out of scope
- Case-normalizing historical serial numbers.
- Vendor-specific serial validation rules.
