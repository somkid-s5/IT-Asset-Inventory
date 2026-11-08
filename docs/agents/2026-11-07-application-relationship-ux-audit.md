# Application relationship UX audit — final evidence ledger

**Scope:** Application list/detail and its linked Asset, VM, Database, and Document destinations. Persona: internal IT operator. Target state: production use within an organization, with V1/V1.1 as the feature boundary. The user identified relationship comprehension as the main UX concern and confirmed this scope.

**Environment:** local production build with the isolated acceptance database `sysops_ux_final_acceptance_20261107`; Admin and Viewer; desktop 1440×900 and mobile 390×844. The personal Chrome profile was not used in the final walkthrough. Evidence screenshots are in `../../browser-uat-sysops-2026-11-08-final-evidence/`.

## Confirmed baseline problems and implemented fixes

1. **Application topology lacked record identity.** Components exposed counts for linked Assets and VMs, leaving operators to leave the Application to discover which host was involved. Detail now shows named, navigable records grouped by kind and component, relationship type, and available lifecycle/responsible-party context. Admin and Viewer journeys verify the path.
2. **Logical Database links lost child context.** Links now identify the child and carry a `#logical-database-<id>` fragment. The parent Database page scrolls to and focuses the selected article; Web→registry and API→audit are covered.
3. **List summaries could overcount shared records.** Application summary totals now deduplicate IDs by record type across components. The retained mobile acceptance snapshot displays 6 distinct records (1 Asset, 3 VMs, and 2 Logical Databases). E2E now calculates its expected total from the current API relationship projection rather than assuming a fixed number of seed rows.
4. **Primary access lacked environment context.** Desktop and mobile expose the owning environment in the primary access label and make the address actionable.
5. **Lifecycle and interaction safety gaps.** Application projection includes linked Asset status; an unrelated Asset edit preserves the credential type visible to operators (isolated before/after round-trip work also checked the remaining metadata); VM/Database copy waits for audit success before writing the clipboard; route-driven Document headers no longer reuse the preceding Application title.
6. **Mobile usability.** A representative relationship link previously measured 21px high and now measures 44px. This is one measured target, not a comprehensive accessibility audit.

## Current locator mapping

| Intent | Semantic locator or visible contract |
|---|---|
| Open the seeded Application | link named `Treasury Registry` |
| Identify its Web component | list item containing `Primary web tier for the deterministic acceptance fixture.` |
| Open the linked Asset | link named `app-prod-01 · DEV-ASSET-004` within the component |
| Open the primary VM | link named `vm-prod-01` within the component |
| Identify a vCenter-deleted VM | link name matching `vm-e2e-deleted-in-vcenter` and `Deleted in vCenter` |
| Open the selected registry database | link matching `Treasury Registry DB · registry`; expected URL ends `#logical-database-<id>` |
| Verify selected child | article accessible name `Logical database registry` |
| Open API audit database | link matching `Treasury Registry DB · audit`; verify article `Logical database audit` |
| Read mobile Application summary | article named `Application Treasury Registry`; verify owner, environment and `Linked records` count |
| Identify environment-owned access | visible `Primary access · UAT` and the address link inside the Application card |
| Verify Viewer VM account context | article named `Guest OS account svc_vm_e2e`; Viewer has no reveal/copy control |
| Verify Viewer Database account context | article named `Database account svc_registry`; Viewer has no secret mutation control |
| Identify account names in a table | table-scoped text, for example `getByRole("table").getByText("report_reader", { exact: true })` |
| Verify document page identity | heading `Getting Started` inside both `main` and `banner`; breadcrumb link `Knowledge Base` |
| Open Asset edit form | button `Edit Asset`; dialog heading `Edit Asset Information` |

Selectors follow the repository locator conventions: roles and names first; no CSS chain or XPath. The acceptance fixture is mutable, so tests that archive/promote shared seed records should run serially or isolate their own records. Final selected command used `--workers=1`.

## Verification record

Final focused run:

```text
npm run test:e2e -- --config=playwright.local-audit.config.ts --workers=1 \
  e2e/vm-v1-acceptance.spec.ts e2e/database-v1-acceptance.spec.ts \
  e2e/docs-crud.spec.ts e2e/document-header-navigation.spec.ts \
  e2e/assets-crud.spec.ts e2e/asset-credential-metadata-preservation.spec.ts \
  e2e/lazy-dialog-loading.spec.ts e2e/application-relationships.spec.ts
```

**Result:** 25 passed. The suite ran serially against the upserted isolated acceptance database. It is a focused set, not the full repository suite. A prior 8-worker run interfered through mutable shared fixture state and also exposed duplicate accessible text in a Database test; the final serial run passed after the table locator was scoped and the mobile summary assertion matched the API's current relationship data.

## Remaining verification limits

- The lazy-dialog regression visits the Asset detail before Edit and verifies no dialog is rendered, then opens the edit dialog. It does not hold a production chunk response in the final test.
- No deployment to the target VM, real vCenter, production database, backup/restore, or organization data was exercised.
- Browser console/network diagnostics, exhaustive keyboard/screen reader checks, and all route states remain outside this scoped pass.
- Project-local `prd-plan`, `product-design-and-ux`, and `production-app-completeness` skill files were not present in the workspace; the orchestration document and installed audit/TDD/review skills were used instead.
