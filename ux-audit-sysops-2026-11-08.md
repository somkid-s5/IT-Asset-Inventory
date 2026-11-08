# UX audit — SysOps Application relationships

Scoped review of how internal IT staff understand an Application’s infrastructure relationships, 2026-11-08. Evidence came from the Codex in-app browser, a local production build, Playwright Chromium journeys, screenshots, and source inspection.

## 1. Scope & evidence base

**Audited:** Application list/detail and the linked Asset, VM, Database, and Document destinations, including selected Logical Database context, role visibility, primary access context, and representative phone layout.

**Platform:** Next.js web application. Desktop 1440×900 and mobile 390×844.

**Audience:** Expert internal IT operators — confirmed by the owner. Admin maintains inventory; Viewer consumes operational context.

**Evidence:** local production build and isolated PostgreSQL acceptance database `sysops_ux_final_acceptance_20261107`; 13 final browser screenshots in [`browser-uat-sysops-2026-11-08-final-evidence/`](browser-uat-sysops-2026-11-08-final-evidence/) and 17 retained images in [`ux-audit-sysops-2026-11-08-evidence/`](ux-audit-sysops-2026-11-08-evidence/); 25 focused Playwright checks passed serially.

**Not audited, and why:**

- Production VM deployment, real organizational data, backups/recovery, and live vCenter or database integrations — this pass used an isolated local acceptance system.
- Every route affordance, loading/empty/offline/API-error state, and every breakpoint — scope was the Application-to-infrastructure lookup journey.
- Full keyboard and screen-reader evaluation, contrast measurements, or WCAG conformance — no complete accessibility test was run.
- Chrome DevTools console/network diagnostic session — the final browser walkthrough used Codex’s in-app browser and local Playwright Chromium, following the user’s preference not to use their personal Chrome.

No accessibility conformance claim is made. Route coverage is real but sampled; the evidence is sufficient to verify the reported relationship changes, not to claim the whole product is ready for production.

## 2. Executive summary

The owner’s main concern was concrete: the application showed related information without making it easy to understand which server, VM, or database belonged to which Application component. The Application detail now groups named, navigable records by Environment and component, and labels shared, primary, archived, and removed relationships where available. A Logical Database link now opens the correct parent page at the selected child, while the list count avoids double-counting shared records. Desktop and mobile access summaries name their Environment; Admin and Viewer can follow the relationship path, with Viewer secret controls kept out of view. We also fixed two data-safety issues found along that path: unrelated Asset edits preserve credential metadata, and copy actions wait for audit success before changing the clipboard. The focused acceptance set passed 25/25 after a fresh seed and serial execution. Organization VM deployment, full-suite E2E, real inventory data, and full accessibility verification remain outside this audit.

## 3. Quick wins

These high-value changes are implemented and independently verifiable in the working tree.

| ID | Finding | Dimension | Severity before fix | Effort |
|---|---|---|---|---|
| UX-01 | Show named Asset/VM records and relationship type inside each component | Data display | High | M |
| UX-02 | Keep the selected Logical Database visible when opening its parent Database | Navigation | Medium | S–M |
| UX-04 | Include the owning Environment with primary access | Content and wayfinding | Medium | S |
| UX-08 | Write credentials to the clipboard only after successful copy audit | Feedback and action safety | High | S |

## 4. Findings

Findings describe the observed pre-fix problem and record the current verification state so the team can see what changed.

### 4.1 Data display and topology — 3 findings

#### UX-01 · Application components did not identify their linked infrastructure

| | |
|---|---|
| **Dimension** | Data display / information hierarchy |
| **Severity before fix** | High |
| **Confidence** | High; baseline regression and current runtime journey |
| **Effort** | M |
| **Location** | `/dashboard/applications/[id]` → Environment topology |

**Evidence.** Before the change, component summaries exposed Asset and VM counts without names. In the current view, Web and API components show named Asset and VM links, Logical Database links, and Primary/Shared relationship labels. The Admin and Viewer journeys open the linked Asset, VM, and selected database; screenshots `02`, `03`, `04`, and `05` in the evidence folder capture the current path.

**Why it matters.** Operators need to answer “where does this Application run?” without opening several inventory lists and reconstructing the relationship from memory.

**Recommendation.** Implemented: group named linked records by type within each component, keep relationship type adjacent to the record, and retain lifecycle state when available.

**Status.** Resolved; current browser behavior and role journeys verified.

#### UX-03 · Shared records could inflate the Application list count

| | |
|---|---|
| **Dimension** | Data display / trust |
| **Severity before fix** | Medium |
| **Confidence** | High; source and runtime count |
| **Effort** | S |
| **Location** | `/dashboard/applications` → Linked records |

**Evidence.** The same Asset, VM, or Logical Database can be linked to multiple components. The list summary now counts distinct IDs by record type. The retained mobile acceptance snapshot shows six records (1 Asset, 3 VMs, 2 Logical Databases); the E2E derives the expected count from the current API relationship projection instead of assuming a fixed fixture size. Mobile summary evidence is screenshot `07`.

**Why it matters.** A total that silently counts relationships instead of records can overstate the inventory attached to an Application.

**Recommendation.** Implemented: deduplicate by record type and ID while counting Assets, VMs, and Logical Databases.

**Status.** Resolved; mobile E2E confirms the rendered count matches the distinct linked records in the API projection.

#### UX-05 · Archived linked Assets lacked their lifecycle label

| | |
|---|---|
| **Dimension** | Data display / state comprehension |
| **Severity before fix** | Medium |
| **Confidence** | High; API response and Admin/Viewer browser test |
| **Effort** | S |
| **Location** | Application relationship projection and topology link |

**Evidence.** The relationship survived archive, but the API omitted Asset status, leaving the Application unable to tell an operator why it was inactive. The projection now includes status and the link labels the archived record. A created-and-cleaned test Asset verifies the state for both roles.

**Why it matters.** An operator could mistake an archived dependency for an active host and trust an outdated topology.

**Recommendation.** Implemented: return lifecycle status in the relationship projection and display it beside the Asset.

**Status.** Resolved; runtime role scenario passed.

### 4.2 Navigation and context — 2 findings

#### UX-02 · Opening a Logical Database lost the selected child context

| | |
|---|---|
| **Dimension** | Navigation and information architecture |
| **Severity before fix** | Medium |
| **Confidence** | High; browser journey and E2E |
| **Effort** | S–M |
| **Location** | Application component → Database detail |

**Evidence.** The registry and audit links previously opened the same Database page with no selected-child indication. Links now carry a child ID fragment; the destination scrolls to and focuses the corresponding Logical Database article. The Web→registry and API→audit journeys passed; screenshot `05` shows registry selected.

**Why it matters.** A shared Database can contain several schemas, and an operator could land on the wrong one or assume the link failed.

**Recommendation.** Implemented: preserve child identity in the destination URL and visibly focus the selected article.

**Status.** Resolved; browser navigation verified on desktop and mobile.

#### UX-09 · Document detail could retain the preceding Application header

| | |
|---|---|
| **Dimension** | Cross-page orientation |
| **Severity before fix** | Low |
| **Confidence** | Medium; one failing selected run was not reproduced in six repeats or the final selected run |
| **Effort** | S |
| **Location** | Application → Document detail |

**Evidence.** The persistent banner and breadcrumb could describe the Application after the main content had changed to a Document. Header state now follows the route. One selected run still observed the old header, but the targeted test passed six consecutive repeats and the final 25-test run. Regression tests cover direct document entry, Application→Document, edit/save return, and subsequent navigation; the initial mismatch remains unreproduced rather than fully explained.

**Why it matters.** A mismatched page title makes it harder to verify where a user is saving or reading operational instructions.

**Recommendation.** Implemented: derive the page header from the active pathname.

**Status.** Current behavior verified in six repeated targeted runs and the final selected run; retain the regression because one earlier run failed and its cause was not reproduced.

### 4.3 Responsive use and content ownership — 2 findings

#### UX-06 · Application relationship links were difficult to tap on mobile

| | |
|---|---|
| **Dimension** | Responsive interaction |
| **Severity before fix** | Medium |
| **Confidence** | High; measured before and after |
| **Effort** | S |
| **Location** | Application detail → component relationship links |

**Evidence.** A representative VM link measured 21px high at 390px width before the change and 44px after. The post-fix mobile detail is screenshot `08`.

**Why it matters.** Small targets make the central lookup journey harder to use on a phone and increase accidental taps.

**Recommendation.** Implemented: apply a larger responsive minimum target to relationship controls.

**Status.** Resolved for the measured target. Other controls and WCAG criteria were not measured.

#### UX-04 · Primary access did not say which Environment owned it

| | |
|---|---|
| **Dimension** | Content and wayfinding |
| **Severity before fix** | Medium |
| **Confidence** | High; E2E on desktop and mobile |
| **Effort** | S |
| **Location** | Application list access summary |

**Evidence.** A primary URL in UAT was previously displayed without its Environment. The list now says `Primary access · UAT` beside the address, and the address is an actionable link. Screenshot `12-mobile-access-summary.png` captures the mobile state.

**Why it matters.** Environment context changes the meaning and risk of an access URL; an operator should not have to infer whether it is production or test.

**Recommendation.** Implemented: include Environment in the primary-access label and preserve the direct link.

**Status.** Resolved; desktop and mobile assertions passed.

### 4.4 Data integrity and sensitive actions — 2 findings

#### UX-07 · Editing unrelated Asset fields could rewrite credential metadata

| | |
|---|---|
| **Dimension** | Forms and data integrity |
| **Severity before fix** | Medium |
| **Confidence** | High; isolated API round trip and regression |
| **Effort** | M |
| **Location** | Asset edit dialog → linked credential |

**Evidence.** An isolated Asset edit reproduced a change from credential metadata `OS/MGMT` to the Access Point’s `Management/null` values. The form now retains credential metadata; after an unrelated edit and reload, the browser regression verifies that the visible credential type remains `OS`. Earlier isolated API round-trip inspection also checked the stored node label and method. No production records were touched.

**Why it matters.** A routine Asset edit could silently corrupt credential classification used by operators and downstream filters.

**Recommendation.** Implemented: preserve the credential’s own metadata instead of rebuilding it from a separate Access Point.

**Status.** Resolved; browser round-trip verifies the visible credential type, and earlier isolated API inspection verified stored metadata fields.

#### UX-08 · Clipboard copy happened before its audit request completed

| | |
|---|---|
| **Dimension** | Feedback and action safety |
| **Severity before fix** | High |
| **Confidence** | High; code path and intercepted 503 browser scenario |
| **Effort** | S |
| **Location** | VM and Database account Copy password actions |

**Evidence.** Previously, audit failure could be reported after a secret had already reached the clipboard. VM and Database handlers now await the audit request before writing. A 503 E2E scenario checks the error feedback and uses a test-only accessible write counter to confirm no clipboard write was attempted. Viewer screens retain no reveal/copy controls; screenshots `13` and `14` show masked account values.

**Why it matters.** Operators need the audit record to reflect whether a sensitive copy action succeeded; a failed audit must not leave an untracked secret in the clipboard.

**Recommendation.** Implemented: complete audit first, then write to the clipboard; surface failure without changing clipboard contents.

**Status.** Resolved; VM and Database failure paths verified.

### Dimensions checked without a current finding

- **Forms and inputs:** representative Asset and Document edit/save flows passed; not every field validation branch was inspected.
- **Feedback and states:** tested copy-audit errors, archived Asset, Viewer restrictions, and representative empty access state. Offline and general API-load errors were not assessed.
- **Visual hierarchy:** topology uses the available width and groups records by type. Dense Database metadata remains an operational table/card presentation; no measured comprehension failure justified a redesign.
- **Trust and permissions:** Viewer secret controls are absent; Admin-only mutation paths are covered in focused tests. This is not a full authorization audit.

## 5. Prioritized backlog

| # | Follow-up | Severity | Effort | Why it is here |
|---|---|---|---|---|
| 1 | Run the same Application→component→record journey on representative organization data with long names, many Environments, and shared records. | Medium | M | The current seed is deterministic and small; real topology density can change wrapping and scan time. |
| 2 | Add a held-chunk regression for lazy dialogs and complete the remaining loading/error/empty-state matrix before deployment. | Medium | S–M | Current test confirms no dialog after navigation and opens Edit successfully, but does not hold the form module while the page loads. |
| 3 | Confirm with product owner whether `Profile & topology` intentionally excludes access points. | Low | S | Source evaluates profile/topology fields only, while access has a separate count. The existing label scopes the metric; the product definition should remain explicit. |

## 6. What is working, and what I left alone

**What is working.** Application detail identifies Assets, VMs, and Logical Databases at the component where they are used. The Logical Database destination preserves the selected child. Viewer access shows account context while keeping password controls out of reach.

**What I left alone, and why.** The graphite surfaces and green accent remain consistent with the SysOps operational context. Uppercase labels in the Database connection and protection sections group compact technical fields, and no observed task failure justified changing them. The seeded empty access state is explicitly labeled; the completeness badge is scoped to “Profile & topology,” so I recorded the definition question instead of changing the V1 rule.

## 7. Open questions

- **Does the team want Application completeness to include at least one access point?** The current evaluator does not count access. If access readiness belongs in this metric, its name, numerator, and guidance should change together; if not, keep the current definition documented.
- **Which actual Application topology should be used for the next comprehension review?** A representative system with several Environments and shared hosts would determine whether the grouped display remains easy to scan at production scale.

## Appendix — evidence log

Evidence names below are relative to `ux-audit-sysops-2026-11-08-evidence/`.

| Evidence | Condition and observation |
|---|---|
| `01-applications-admin-desktop.png` | Admin Application list on desktop; owner, Environment, counts and access summary. |
| `02-application-detail-admin-desktop.png` | Admin detail showing component-grouped links, relation types, status, and canonical document. |
| `03-linked-asset-admin-desktop.png` | Linked Asset with Application return relationship. |
| `04-linked-vm-admin-desktop.png` | Linked VM and Application relationship context. |
| `05-linked-database-admin-desktop.png` | Database detail with selected `registry` Logical Database. |
| `06-linked-document-admin-desktop.png` | Document title and Knowledge Base breadcrumb. |
| `07-applications-admin-mobile-390.png` | Application list at 390px; the run includes the current linked-record total. |
| `08-application-detail-admin-mobile-390.png` | Component relationships at phone width. |
| `09-linked-vm-admin-mobile-390.png` | Linked VM and account context at phone width. |
| `10-linked-database-admin-mobile-390.png` | Database page with the selected Logical Database context at phone width. |
| `11-application-detail-viewer-desktop.png` | Viewer Application detail without mutation controls. |
| `11-shared-asset-responsibility.png` | Primary and shared Asset relationship with responsible party. |
| `12-mobile-access-summary.png` | UAT access point with Environment, method and address. |
| `13-viewer-vm-credentials.png`, `14-viewer-database-credentials.png` | Viewer account context with passwords masked and no reveal action. |
| `12-vm-copy-audit-failure.png`, `13-database-copy-audit-failure.png` | Visible failure feedback when copy audit is rejected; clipboard preservation is verified in the E2E assertion. |

Earlier exploratory output not referenced by this report was kept out of the evidence ledger. The final screenshots in this report were captured by local Playwright Chromium; the manual orientation browser was Codex’s in-app browser.
