## Parent
Ticket 05 — Connect Hardware Assets to Application topology

## Status
DECIDED — 2026-09-06

## Decision 1 — Environment vocabulary and ownership

The authoritative V1 Environment vocabulary remains `PROD`, `UAT`, `TEST`, matching the approved V1 spec and `docs/GLOSSARY.md`.

For physical Assets, environment is **not** authoritative record-level ownership. The operational environment of an Asset is determined by the Application Environment / Component relationships that use it. This allows one shared physical Asset to support more than one environment without duplicating or lying about the Asset record.

Rules:
- Application/VM/Database environment vocabulary: `PROD`, `UAT`, `TEST`.
- Do not silently default unknown context to DEV or PROD.
- Existing nullable `Asset.environment` is treated as legacy compatibility data until a dedicated migration/removal slice is approved.
- Do not expose `Asset.environment` as a primary Asset-list filter in V1; a later relationship-aware filter may filter Assets by related Application Environment.
- Existing legacy `DEV` values must be preserved during migration and explicitly mapped/reviewed; never mass-convert them by guessing.

## Decision 2 — Asset lifecycle vs MA/support state

`AssetStatus` is an operational lifecycle/status field only. It must not double as a maintenance-agreement/support-contract field.

Rules:
- `ACTIVE`, `INACTIVE`, `MAINTENANCE`, `DECOMMISSIONED`, `ARCHIVED` describe operational/lifecycle state.
- UI labels such as `Under MA` / `MA Expired` are semantically incorrect for `ACTIVE` / `INACTIVE` and require a bounded remediation slice.
- Warranty/support/MA coverage must remain separate from lifecycle. Existing `warrantyExpiration` may inform warranty attention but is not a substitute for a future support-contract model if the team needs one.
- No broad schema migration is authorized by this decision alone.

## Follow-up implementation boundaries

- 05b exposes Asset `owner` and `location` filters only; it must not strengthen the legacy Asset environment field.
- A later bounded slice removes the automatic `DEV` default from Asset create/edit and corrects lifecycle labels without rewriting unrelated Asset behavior.
- Relationship-aware environment filtering belongs with Application topology, not a free-text Asset environment field.

## Evidence

- `docs/specs/2026-09-04-v1-inventory-registry.md`: controlled Environment vocabulary is PROD/UAT/TEST and Application is the primary aggregate.
- `docs/GLOSSARY.md`: Environment is defined for Application, VM, and Database; Components relate physical Assets to an Application Environment.
- `backend/prisma/schema.prisma`: current Asset environment is nullable free text and AssetStatus is lifecycle-like.
