# Database Ticket 07 Gap Audit — 2026-09-06

Parent ticket: `docs/tickets/v1/07-model-database-instances-and-logical-databases.md`

## Verdict

Ticket 07 is **partially implemented**. The data model contains Database Instance, Logical Database, Account, host Asset/VM relations, Application Component relations, archive/restore, and credential audit plumbing, but several production-completeness gaps remain.

## High-priority findings

1. **Account edits can destroy secrets.**
   - `DatabasesService.update()` deletes and recreates all accounts.
   - `buildAccounts()` encrypts `account.password ?? ''`.
   - Database Detail safe projection intentionally does not return plaintext passwords, so opening Edit and saving without re-entering a password can replace a valid encrypted secret with an encrypted empty string.

2. **Minimum Instance identity is stricter than the V1 requirement.**
   - Create DTO currently requires `host`, `ipAddress`, and at least one account.
   - Ticket 07 requires display name + engine + host **or related compute identity** as minimum identity, with missing context reported as `Needs Context` instead of guessed or blocking values.
   - `hostAssetId` / `hostVmId` exist in schema but are not exposed by the current Database Form.

3. **Host relationships exist but are not product-visible.**
   - `DatabaseInventory` supports `hostAsset` and `hostVm` relations.
   - Database Form does not provide an Asset/VM picker.
   - Database Detail displays only the free-text `host`, not a navigable host relation.

4. **Logical Database ↔ Application relationship is not navigable from Database.**
   - Schema relation exists and Application topology can select Logical Databases.
   - Database Detail shows only `N application component link(s)` and no Application / Environment / Component identity or navigation.
   - Application Detail currently summarizes logical DB count but does not present an obvious reverse navigation surface.

5. **Account identity/scope is underspecified in persistence.**
   - `DatabaseAccount` has no uniqueness constraint for `(databaseInventoryId, username)`.
   - `scope` is a free string; backend does not enforce `INSTANCE` vs `LOGICAL_DATABASES` semantics.
   - Scope IDs are validated to belong to the Instance, but empty/non-empty scope consistency is not enforced.

6. **Legacy `linkedApps` duplicates canonical topology intent.**
   - Database Instance stores `linkedApps: String[]` and UI labels it as Application Connections using IP addresses.
   - Canonical V1 topology is Logical Database ↔ Application Component. This field risks becoming a competing source of truth and should be classified as legacy/operational connection metadata or retired from primary topology UX.

7. **Logical Database creation UX is not first-class.**
   - Service has create/update/delete Logical Database endpoints.
   - Main Database Form edits Logical Database names through one comma-separated input.
   - Database Detail has no dedicated Logical Database CRUD controls despite the two-level inventory requirement.

8. **Data Quality does not evaluate core host relationship / Logical DB topology.**
   - Current checks focus on owner, environment, backup policy, and account presence.
   - It does not surface missing host identity/relation or absence of Logical Database/Application context.

## Existing strengths

- `LogicalDatabase` already has `@@unique([databaseInventoryId, name])`.
- Host relations use foreign keys with `onDelete: SetNull`.
- Database Detail projection does not expose encrypted passwords.
- Reveal and copy operations are role-gated to ADMIN/EDITOR and create VIEW_PASSWORD / COPY_PASSWORD audits.
- Archive and restore update Instance status rather than deleting the aggregate.
- Logical Database component IDs are validated against existing Application Components.

## Remediation slices

- `07a-database-identity-host-contract.md`
- `07b-database-account-secret-scope-contract.md`
- `07c-logical-database-application-navigation.md`
- `07d-database-archive-rbac-persistence.md`
- `07e-database-legacy-linkedapps-and-list-contract.md`

Ticket 07 must not be marked complete until the account data-loss risk and host/logical topology gaps are closed and runtime browser acceptance is green.
