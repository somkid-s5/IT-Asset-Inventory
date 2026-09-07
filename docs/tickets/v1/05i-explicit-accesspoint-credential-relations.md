## Parent
Ticket 05 — Connect Hardware Assets to Application topology

## Goal
Make Asset Access Point-to-Credential relationships explicit and cardinality-correct. One Access Point may have multiple credential accounts, and a credential relationship must not be reconstructed from duplicated node/type/method/version display fields.

## Current defect
- `IPAllocation.credentialId` models at most one credential per Access Point.
- The UI supports multiple users/accounts per Access Point and currently reconstructs associations by matching duplicated metadata when an explicit ID is absent.
- New Asset creation creates Access Points and credentials without a durable explicit relationship, so the edit flow depends on heuristic reconstruction.

## Decision
Introduce an explicit join model between `IPAllocation` (the current persisted Access Point record) and `Credential`.

- One Access Point can link to many Credentials.
- One Credential may be linked to more than one Access Point if operationally needed.
- Existing `IPAllocation.credentialId` is treated as a legacy compatibility field during migration only; new application behavior must use the join relation.
- Migration backfills one join row for every existing non-null legacy `credentialId`.
- No matching by nodeLabel/type/manageType/version is allowed after the migration path is available.

## Vertical slice
Prisma schema/migration -> Asset service create/update/detail -> DTO contract -> Asset dialog load/save -> tests -> browser journey.

## Required behavior
- Create Asset with one Access Point and multiple accounts persists explicit links for every account.
- Edit preserves existing credential IDs/passwords and their explicit Access Point links.
- Moving/removing an account changes explicit relation records, not display metadata heuristics.
- Asset detail/edit projections expose the explicit relation safely without encrypted password material.
- Credential reveal/copy permission and audit behavior remain unchanged.
- Legacy data with `IPAllocation.credentialId` is backfilled into the join model.

## Acceptance evidence
- Prisma migration contains deterministic legacy backfill SQL.
- Focused backend tests cover one access point -> multiple credentials, multiple access points -> shared credential link where allowed, create/update preservation, and absence of metadata reconstruction.
- Frontend no longer contains fallback matching by nodeLabel/type/manageType/version.
- Existing credential reveal/copy tests remain green.
- Playwright proves Host and Management access points each retain their own multiple accounts after save/reload.

## Out of scope
- General password-manager redesign.
- Changing credential encryption.
- Removing the legacy column before migration compatibility is proven.
