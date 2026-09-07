# Asset Ticket 05 Re-Audit — 2026-09-06

Scope: Ticket `docs/tickets/v1/05-connect-hardware-assets-to-applications.md` after remediation slices 05a–05j.

Decision vocabulary:
- **CODE PASS** — schema/service/API/UI/static/unit evidence is present and currently green.
- **BROWSER PENDING** — implementation and browser spec exist or are prepared, but the running frontend/backend acceptance stack was not available in this orchestration session.
- **FAIL** — a known product/data/UX gap remains.

## Executive result

Ticket 05 is **CODE-COMPLETE FOR THE AUDITED SCOPE, BROWSER ACCEPTANCE PENDING**.

The original audit found dead-end governance fields, stranded filters, pagination-bound parent selection, wrong environment/status semantics, detail-sized list payloads, incomplete type navigation, ambiguous Application relationships, legacy bulk endpoints, heuristic Access Point credential reconstruction, and missing Serial Number uniqueness. Those code/data gaps have now been remediated.

Do **not** close Ticket 05 in the issue tracker until the browser acceptance stack proves the remaining runtime journeys.

## Acceptance trace

| Ticket 05 criterion | Status | Evidence |
| --- | --- | --- |
| Users can list, search, filter, create, view, and edit Assets according to role | CODE PASS / BROWSER PENDING | Asset list uses server paging/search/type/owner/location/archive filters with URL persistence; controller restricts create/update to ADMIN/EDITOR while reads remain authenticated. Browser filter/CRUD specs exist but have not run against a live stack in this session. |
| Name + type minimum identity; optional Asset ID + Serial unique | CODE PASS | `Asset.assetId` and `Asset.sn` are unique nullable identifiers; service trims/normalizes blanks and rejects readable duplicate conflicts; migration refuses to hide real duplicate serials. Identity tests pass. |
| Missing context produces Needs Context with exact guidance without blocking creation | CODE PASS / BROWSER PENDING | centralized Asset Data Quality returns exact missing field strings; governance fields are now editable; E2E remediation flow was added for missing owner but runtime execution remains pending. |
| One Primary Application relationship is prominent and additional Shared relationships remain available | CODE PASS / BROWSER PENDING | structured `componentLinks` contract enforces max one PRIMARY per Asset; Application topology automatically assigns PRIMARY/SHARED without duplicate-primary drift; Asset Form and Detail show Primary/Shared context. Relation unit tests pass. |
| Host and Management Access Points retain node, method, address, version, multiple credential accounts | CODE PASS / BROWSER PENDING | Access Point form retains these fields; explicit many-to-many `IPAllocationCredential` join now supports multiple accounts per Access Point and shared credential links. Browser save/reload journey still required. |
| Access Point-to-Credential relationships are explicit and not reconstructed from duplicated display fields | CODE PASS | new join model + deterministic migration backfill; runtime Form/Detail consume explicit `credentialIds[]`; old metadata matching runtime code was removed. Unlinked legacy credentials are surfaced/preserved as unassigned rather than guessed. |
| Viewer cannot reveal; Editor/Admin can reveal; reveal/copy audited | CODE PASS / BROWSER PENDING | credential controller gates reveal/copy to ADMIN/EDITOR; service tests prove reveal audit and COPY_PASSWORD audit. Viewer browser denial remains runtime acceptance evidence. |
| Archive + Admin restore preserve Access Points, credentials, Application links, Documents, notes, attachments, history | CODE PASS / BROWSER PENDING | archive/restore mutate Asset status only; focused tests assert no nested delete/replace behavior. Full save/archive/restore/reload browser persistence still required. |
| Import/Bulk Update removed; ordinary CSV superseded by Sensitive Inventory Export | CODE PASS | Asset frontend dead bulk/CSV paths removed; legacy Asset bulk-import/bulk-update controller/service/DTO endpoints removed; no backend source references remain. |
| Asset List/Detail/Dialog use shared templates in both themes/responsive behavior | STATIC PASS / BROWSER PENDING | existing shared layout/components retained; no visual-system rewrite was introduced. Theme/responsive behavior requires browser viewport/theme verification. |
| Browser journeys prove progressive creation, both access layers, Application linking, credential access, archive/restore, persistence | BROWSER PENDING | Dedicated `frontend/e2e/assets-v1-acceptance.spec.ts` now covers the missing operational, Viewer-denial, and copy-audit journeys and compiles successfully under `playwright test --list`; runtime execution still requires the isolated acceptance stack. |

## Remediation slices

- **05a Governance Context** — CODE PASS; browser Data Quality remediation pending.
- **05b Operational Filters** — CODE PASS; browser URL/reload/filter behavior pending.
- **05c Parent Picker** — CODE PASS; backend hierarchy tests pass; browser outside-page picker journey pending.
- **05d Domain Semantics Decision** — PASS; Asset Environment is not treated as authoritative; PROD/UAT/TEST remains Application environment vocabulary; lifecycle is separate from MA/support semantics.
- **05e Semantics Cleanup** — CODE PASS; wrong ACTIVE=Under MA / INACTIVE=MA Expired labels removed; no default DEV manufacturing on Asset edit/create.
- **05f Slim List + Type Navigation** — CODE PASS; detail-only payload removed from list and SERVER/STORAGE/SWITCH/SP/NETWORK are reachable.
- **05g Application Relation Contract** — CODE PASS; PRIMARY/SHARED invariant enforced across Asset and Application write paths.
- **05h Remove Legacy Bulk Endpoints** — PASS; final verification succeeded after route/service/DTO removal.
- **05i Explicit Access Point Credential Relations** — CODE PASS; join model, migration/backfill, explicit UI contract, multi-account tests, credential regression tests all green.
- **05j Asset Identity Uniqueness** — CODE PASS; nullable unique serial, duplicate-readable validation, migration guard, identity tests green.

## Current verification evidence

Latest focused verification:
- Backend Asset/Application/Credential acceptance contracts: **39/39 tests passed** across 9 suites.
- Backend build: **TSC 0 issues**, 101 files compiled successfully.
- Prisma schema validation: PASS using a validation-only temporary DATABASE_URL.
- Frontend Asset Form/List/Detail and the new V1 acceptance spec: ESLint + TypeScript `--noEmit` PASS.
- `npx playwright test e2e/assets-v1-acceptance.spec.ts --list`: PASS; all 3 V1 browser journeys and auth setup projects are discoverable without starting the runtime stack.
- Credential copy flow was corrected to reveal through the protected endpoint when necessary, write to clipboard, and record the explicit `/copy` audit instead of checking a password field that is intentionally absent from Asset Detail responses.
- Deterministic `Treasury Registry / PROD / Web + API` seed topology was added for Primary/Shared browser evidence.
- `git diff --check`: PASS.

## Browser acceptance still required

Run against the isolated Compose-backed acceptance environment from the V1 spec, not an ad-hoc developer state. Required browser evidence:

1. Progressive create of an Asset missing context; Data Quality lists exact issues.
2. Add Owner through normal edit; owner issue disappears after refresh.
3. Server-side owner/location filters survive URL reload, combine with search/type/paging, reset cleanly, and show filtered-empty state.
4. Parent picker finds a valid parent outside table page 1; save/reload; parent/child navigation works.
5. Create Host and Management Access Points with multiple accounts; save/reload; each Access Point retains exactly its explicit accounts.
6. Primary + Shared Application Component links save/reload and navigate correctly.
7. Viewer cannot reveal/copy secret values; Editor/Admin can; corresponding audit rows appear.
8. Archive then restore; Access Points, credential links, Application links, Documents, notes, attachments, and history remain available.
9. Light/dark theme and approved responsive widths do not break List/Detail/Dialog workflows.
10. Restart Compose services without deleting volumes and prove created Asset relationships/credentials remain usable.

## Gate decision

**No known Ticket 05 code/data-model blocker remains from the audited acceptance criteria. Do not mark the ticket fully DONE until the browser acceptance matrix above is green.**
