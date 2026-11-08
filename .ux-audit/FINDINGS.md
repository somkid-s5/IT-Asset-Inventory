# Scoped UX audit — SysOps Application relationships

**Status:** Completed for the approved Application-to-infrastructure lookup journey, 2026-11-08. This is not a whole-product audit.

## Scope and evidence

- **User:** internal IT operator; Admin performs changes, Viewer reads operational context.
- **Task:** open an Application and determine its environment, component, physical/virtual hosts, logical database, access point and supporting document; follow links and understand each record’s role and state.
- **Routes visited:** `/dashboard/applications`, `/dashboard/applications/[id]`, `/dashboard/assets/[id]`, `/dashboard/virtual-machines/[id]`, `/dashboard/databases/[id]`, `/dashboard/docs/[id]`.
- **Conditions:** local production build backed by the isolated acceptance database `sysops_ux_final_acceptance_20261107`; desktop 1440×900 and mobile 390×844; Admin and Viewer where applicable.
- **Browser:** Codex in-app browser for manual orientation and local Playwright Chromium for repeatable journeys and retained screenshots. The user’s personal Chrome was not used in this final walkthrough.
- **Evidence:** [browser UAT evidence](../browser-uat-sysops-2026-11-08-final-evidence/) and [UX evidence](../ux-audit-sysops-2026-11-08-evidence/).

## Unslop direction

- **Product:** SysOps helps internal IT staff find and maintain operational infrastructure context for business applications.
- **Character:** calm, exact, operational.
- **World:** an internal infrastructure console where relationships and current state matter more than decoration.
- **Moments:** the environment topology and the selected Logical Database relationship.
- **Signature:** show relationship type and lifecycle beside the named record it describes.

The existing graphite surfaces and green operational accent fit the product. The screens do not show the common gradient/glow/emoji treatment. No broad visual restyle was justified; work stayed on relationship identity, context, and action feedback.

## Findings

| ID | Severity before fix | Finding | Status after change |
|---|---|---|---|
| UX-01 | High | Application detail summarized linked Assets and VMs as counts, so operators could not identify the actual infrastructure. | Fixed and verified for Admin and Viewer. |
| UX-02 | Medium | A Logical Database link opened the parent Database without identifying which child record the operator selected. | Fixed with a selected-record anchor and focus. |
| UX-03 | Medium | Application list counts could count the same shared record more than once. | Fixed by counting unique record IDs. |
| UX-04 | Medium | Primary access was visible without naming its owning Environment. | Fixed; desktop and mobile show `Primary access · UAT`. |
| UX-05 | Medium | Archived linked Assets lacked lifecycle context in the Application projection. | Fixed; archived state is returned and labeled. |
| UX-06 | Medium | Application-to-detail links were too small to tap comfortably on a phone. | Fixed; representative relationship target measured at 44px. |
| UX-07 | Medium | Asset edits could rewrite credential metadata from a different Access Point field. | Fixed; browser regression confirms the visible credential type remains distinct after reload, with earlier isolated API round-trip inspection of stored metadata. |
| UX-08 | Medium | VM and Database copy actions wrote to the clipboard before audit logging completed. | Fixed; audit must succeed before clipboard write. Failure path is covered with a retained clipboard sentinel. |
| UX-09 | Low | A previous Application header could remain visible after navigating to a Document. | Current behavior passes six repeat runs and the final selected suite; one earlier failure remains unexplained and unreproduced. |

The findings describe pre-fix behavior. The post-fix verification level and known limits are detailed in the [UX audit](../ux-audit-sysops-2026-11-08.md), [interaction audit](../interaction-intelligence-audit.md), and [browser UAT](../browser-uat-sysops-2026-11-08-final.md).

## Route coverage

| Route | Observed journey | Limits |
|---|---|---|
| Application list | Desktop and mobile list, linked-record count, access summary, viewer route. | Not every filter, archive action, and empty/error state was walked. |
| Application detail | Admin and Viewer, named component records, relationship types, archived Asset, access context, document link. | Not every editing and validation branch was walked. |
| Asset detail | Follow link, verify relationship and return path; edit journey and metadata preservation. | Not a full Asset information-architecture audit. |
| VM detail | Follow link, verify relationship/lifecycle, Viewer secret controls, Admin reveal/copy behavior. | No live vCenter synchronization was exercised. |
| Database detail | Follow link to the selected logical child, account scope and credential behavior. | No live database connection was attempted. |
| Document detail | Follow link, verify its own page header, edit/save and navigate onward. | Other knowledge-base routes are outside scope. |

## Acceptance evidence

- Final selected Playwright run: **25 passed** with one worker against the isolated acceptance database after explicit reseeding.
- The run covered the Application relationship suite, Asset CRUD and credential metadata, VM/Database V1 acceptance and lifecycle, Document CRUD/header navigation, and lazy Asset dialog behavior.
- A parallel exploratory run against mutable shared fixtures produced failures from test-state interference and ambiguous duplicate-text locators. The mobile summary assertion now derives its expected count from the current API relationship projection. One Document-header test failure in an earlier selected run was not reproduced in six repeats or the final run; see the UAT report for the history.
- Frontend production build, TypeScript compilation and prior targeted lint passed. The full repository E2E suite was not run to completion in this final pass.

## Not audited

- Production deployment on an organization VM, recovery/backup behavior, real inventory data, and live vCenter/database integrations.
- Exhaustive keyboard and screen-reader use, WCAG conformance, offline behavior, all routes, and every loading/error/empty state.
- Chrome DevTools console/network diagnostics in the final walkthrough. The browser evidence came from Codex’s in-app browser and local Playwright Chromium, per the user’s browser preference.

No accessibility conformance claim is made.
