# Interaction Intelligence Audit — SysOps Application relationships

## Executive Summary

**Audited:** Application-to-infrastructure lookup journey across Application, Asset, VM, Database, and Document screens; Admin and Viewer; desktop and 390px mobile.

**Audit Profile:** Production target; local production build and isolated acceptance data.

**Top Risks:**
- Application relationships lacked record identity — resolved and verified.
- A Logical Database link discarded the selected child context — resolved and verified.
- Credential edits and clipboard copy could change data or expose a secret before the expected preservation/audit step — resolved and verified.

The initial interaction gaps made a common operator task depend on manually reconstructing relationships across pages. The working tree now carries record identity, lifecycle, and Environment context through the key paths. Asset credential metadata is preserved on unrelated edits, and clipboard writes are gated on successful audit. The focused Playwright set passed 25/25 after a fresh seed and serial execution. This does not establish whole-product release readiness: the full E2E suite, production VM deployment, live integrations, and full accessibility/security reviews were not performed.

## Critical Issues

None found in the scoped journey.

## High Priority Issues

Issue:                      Application component relationships did not identify their infrastructure records
Severity:                   High
Audit Profile:              Production
Initial Evidence Level:     Runtime Observed
Current Verification Level: Runtime Observed + Test Verified
Verification Status:        Verified
Confidence:                 High
Evidence History:
  - Type: Runtime Observed + Test Verified  Source: `/dashboard/applications/[id]`; `e2e/application-relationships.spec.ts`; `02-application-detail-admin-desktop.png`  Timestamp: 2026-11-08 02:46 UTC  Notes: Baseline showed relationship counts without Asset/VM identities. Current Web and API components show named links, relation types, lifecycle labels, and the selected database destination; Admin and Viewer journeys pass.
Risk if Unfixed:            Operators may fail to identify the machine or database that serves an Application, or make changes against the wrong record.
Implementation Effort:      Medium
Recommended Timing:         Current Sprint
Impact:                     Internal IT operators performing Application lookup and handoff.
Recommendation:             Implemented: show named Assets, VMs, and Logical Databases grouped under their Environment and component; place relationship type and available status beside each target.
Manual Verification Steps:  Verified by focused Admin and Viewer journeys; no additional manual step required for this finding.

Issue:                      Credential copy could write a password before the copy audit completed
Severity:                   High
Audit Profile:              Production
Initial Evidence Level:     Static Inference
Current Verification Level: Runtime Observed + Test Verified
Verification Status:        Verified
Confidence:                 High
Evidence History:
  - Type: Static Inference  Source: VM and Database account copy handlers  Timestamp: 2026-11-08 02:46 UTC  Notes: Previous order wrote to clipboard before posting the audit event.
  - Type: Runtime Observed + Test Verified  Source: `e2e/application-relationships.spec.ts` → `credential copy audit failures`; VM and Database detail routes  Timestamp: 2026-11-08 02:46 UTC  Notes: Intercepted both audit requests with 503; UI reports failure and the accessible test-only clipboard write counter remains zero.
Risk if Unfixed:            A secret could reach the clipboard without a completed audit event, weakening operational accountability.
Implementation Effort:      Low
Recommended Timing:         Current Sprint
Impact:                     Admins copying VM and Database credentials.
Recommendation:             Implemented: await the audit endpoint before writing the clipboard; report failure and leave clipboard contents unchanged when audit fails.
Manual Verification Steps:  Verified with intercepted 503 responses for both resource types; no additional manual step required for this finding.

## Medium Priority Issues

Issue:                      Logical Database navigation discarded the selected child record
Severity:                   Medium
Audit Profile:              Production
Initial Evidence Level:     Runtime Observed
Current Verification Level: Runtime Observed + Test Verified
Verification Status:        Verified
Confidence:                 High
Evidence History:
  - Type: Runtime Observed + Test Verified  Source: Application→Database route; `e2e/application-relationships.spec.ts`; `05-linked-database-admin-desktop.png`  Timestamp: 2026-11-08 02:46 UTC  Notes: Web→registry and API→audit links now carry an identifier fragment; the Database page focuses the matching article.
Risk if Unfixed:            An operator may not know which schema a shared Database link referred to.
Implementation Effort:      Medium
Recommended Timing:         Current Sprint
Impact:                     Operators tracing application components into a shared Database.
Recommendation:             Implemented: include the Logical Database identifier in the destination fragment and focus the corresponding article after data loads.
Manual Verification Steps:  Verified for both seeded child records at desktop and mobile sizes.

Issue:                      Application list total could count shared records more than once
Severity:                   Medium
Audit Profile:              Production
Initial Evidence Level:     Test Verified
Current Verification Level: Runtime Observed + Test Verified
Verification Status:        Verified
Confidence:                 High
Evidence History:
  - Type: Test Verified  Source: `e2e/application-relationships.spec.ts` → `mobile operational summaries`  Timestamp: 2026-11-08 02:46 UTC  Notes: Before the fix, shared links inflated the count; current total deduplicates IDs by record type. The retained mobile acceptance snapshot reports six distinct records (1 Asset, 3 VMs, 2 Logical Databases), and E2E derives the expected count from the API's current relationship projection.
Risk if Unfixed:            Inventory totals can appear larger than the distinct records actually linked to an Application.
Implementation Effort:      Low
Recommended Timing:         Current Sprint
Impact:                     Admins and Viewers scanning or comparing Application summaries.
Recommendation:             Implemented: count unique IDs with type-qualified keys across linked Assets, VMs, and Logical Databases.
Manual Verification Steps:  Verified with the isolated Application fixture and mobile Application card; assertion follows the actual relationship projection rather than assuming a fixed record count.

Issue:                      Archived Asset status was not available in the Application relationship projection
Severity:                   Medium
Audit Profile:              Production
Initial Evidence Level:     Runtime Observed
Current Verification Level: Runtime Observed + Test Verified
Verification Status:        Verified
Confidence:                 High
Evidence History:
  - Type: Runtime Observed + Test Verified  Source: Application API projection; `e2e/application-relationships.spec.ts` → `archived component asset`  Timestamp: 2026-11-08 02:46 UTC  Notes: The relationship remains visible after archive and now identifies its lifecycle for Admin and Viewer.
Risk if Unfixed:            Operators may treat a retired Asset as active infrastructure.
Implementation Effort:      Low
Recommended Timing:         Current Sprint
Impact:                     Operators using topology to assess active dependencies.
Recommendation:             Implemented: return Asset lifecycle status in Application relationships and label it on the link.
Manual Verification Steps:  Verified by archiving and restoring an isolated test record for both roles.

Issue:                      Primary access lacked its owning Environment label
Severity:                   Medium
Audit Profile:              Production
Initial Evidence Level:     Test Verified
Current Verification Level: Runtime Observed + Test Verified
Verification Status:        Verified
Confidence:                 High
Evidence History:
  - Type: Runtime Observed + Test Verified  Source: `/dashboard/applications`; `e2e/application-relationships.spec.ts` → `mobile Application access summary`; `12-mobile-access-summary.png`  Timestamp: 2026-11-08 02:46 UTC  Notes: Primary access now displays `Primary access · UAT` and the actionable address on desktop and mobile.
Risk if Unfixed:            An operator may use a TEST/UAT address while believing it is the production entry point.
Implementation Effort:      Low
Recommended Timing:         Current Sprint
Impact:                     Operators opening an Application from the registry.
Recommendation:             Implemented: display the Environment beside the primary access label and keep the URL actionable.
Manual Verification Steps:  Verified for a seeded Application with PROD and UAT environments.

Issue:                      Asset form could replace credential metadata using a separate Access Point value
Severity:                   Medium
Audit Profile:              Production
Initial Evidence Level:     Runtime Observed
Current Verification Level: Runtime Observed + Test Verified
Verification Status:        Verified
Confidence:                 High
Evidence History:
  - Type: Runtime Observed  Source: Isolated Asset credential create/edit/read round trip  Timestamp: 2026-11-08 02:46 UTC  Notes: Saving unrelated Asset fields changed credential type and node label to values from the Access Point.
  - Type: Runtime Observed + Test Verified  Source: Isolated API round trip and `e2e/asset-credential-metadata-preservation.spec.ts`  Timestamp: 2026-11-08 02:46 UTC  Notes: The browser reload confirms the visible credential type remains `OS`; isolated API inspection confirmed node label and method metadata remain intact.
Risk if Unfixed:            Routine inventory maintenance can silently change credential classification and break downstream interpretation.
Implementation Effort:      Medium
Recommended Timing:         Current Sprint
Impact:                     Admins editing Assets that have linked credentials.
Recommendation:             Implemented: preserve the credential’s own metadata during unrelated Asset edits.
Manual Verification Steps:  Verified through an Asset edit/reload in the browser and an isolated API round trip; the E2E test archives its temporary record afterward.

Issue:                      Small relationship targets hindered phone-size navigation
Severity:                   Medium
Audit Profile:              Production
Initial Evidence Level:     Runtime Observed
Current Verification Level: Runtime Observed + Test Verified
Verification Status:        Verified
Confidence:                 High
Evidence History:
  - Type: Runtime Observed + Test Verified  Source: Application detail at 390×844; mobile relationship E2E  Timestamp: 2026-11-08 02:46 UTC  Notes: A VM link measured 21px high before and 44px after the responsive target change; mobile navigation passed.
Risk if Unfixed:            Phone users may miss the desired relationship or trigger an adjacent link.
Implementation Effort:      Low
Recommended Timing:         Current Sprint
Impact:                     IT staff looking up infrastructure from a phone.
Recommendation:             Implemented: use a 44px minimum relationship target at the measured breakpoint.
Manual Verification Steps:  One representative target was measured; comprehensive touch and accessibility checks remain outside scope.

## Low Priority Improvements

Issue:                      Document detail could retain the previous Application header
Severity:                   Low
Audit Profile:              Production
Initial Evidence Level:     Runtime Observed
Current Verification Level: Runtime Observed + Test Verified
Verification Status:        Verified
Confidence:                 High
Evidence History:
  - Type: Runtime Observed + Test Verified  Source: `e2e/document-header-navigation.spec.ts`; `/dashboard/docs/[id]`  Timestamp: 2026-11-08 02:46 UTC  Notes: Header follows the pathname in six consecutive targeted repeats and the final selected run. One earlier selected run failed to replace the preceding Application header; the failure was not reproduced and its cause remains unexplained.
Risk if Unfixed:            Users can lose page orientation when switching from an Application to its document.
Implementation Effort:      Low
Recommended Timing:         Current Sprint
Impact:                     Admins and Viewers consulting canonical operating documents.
Recommendation:             Implemented: synchronize the page header with the current route.
Manual Verification Steps:  Verified in six repeated targeted runs and the final selected run; retain the regression because one earlier run failed and its cause was not reproduced.

## Verification & Evidence Summary

- **Verified Findings** (Runtime Observed / Test Verified): 9 — relationship identity, selected Logical Database context, shared-record count, Asset lifecycle, Environment access label, credential metadata preservation, copy audit ordering, mobile target size, and Document header consistency.
- **Static Inferences:** 0 current unresolved findings. The copy-order issue began as a source-level inference and is now runtime/test verified.
- **Runtime Verification Recommended:** 0 scoped findings; production integration and deployment checks are out of scope, not implied to have passed.
- **Manual Verification Required:** 0 findings remain open in this scoped list. Broader keyboard/screen-reader, data-scale, network/offline, and deployment checks remain unassessed.

**Runtime tooling:** Codex in-app browser for manual orientation; local Playwright Chromium against the production build and isolated PostgreSQL acceptance database; 25 focused E2E checks passed with one worker. The test stack used localhost and an isolated DB named `sysops_ux_final_acceptance_20261107`. No user Chrome session was used in the final walkthrough. The full E2E suite, browser console/network diagnostics, live vCenter, and deployment environment were not validated.

## Category Scores

Scores are scoped heuristic summaries, not release certifications.

### Primary — Interaction Logic (Tier 1)

- **User-Flow Integrity** (02, 03): 9/10 — Application→Asset/VM/Database/Document paths and selected child context pass for representative roles.
- **Product-State Logic** (01, 04, 05, 09, 11): 8/10 — Archived, deleted, and incomplete fixture states are distinguishable; not every loading/empty/error branch was audited.
- **Action Safety & Data Integrity** (06, 07, 08): 8/10 — Asset credential metadata is preserved; sensitive copy awaits audit; remaining forms were sampled.
- **Cross-Page & Cross-Component Consistency** (22): 8/10 — Relationship labels and page headers stay consistent along sampled paths.
- **Permissions & Access Control** (12): 8/10 — Viewer editing/reveal controls and Admin sensitive actions were sampled; this is not a full authorization review.
- **AI-Native Interaction Logic** (21): N/A — SysOps is not an AI product.
- **Regression & Release Readiness** (18, 20, 23): 7/10 — 25 focused checks pass serially; full suite and deployment gate were not run.

### Conditional / Secondary (Tier 2 — score only where it materially affected behavior; else `N/A`)

- **Accessibility** (13): 7/10 — One representative mobile target was raised to 44px; keyboard, screen reader, and conformance evaluation were not completed.
- **Responsive & Internationalization** (14, 15): 7/10 — 390px behavior was checked; other breakpoints and language coverage were not assessed.
- **Motion** (10): N/A — No motion behavior materially affected this journey.
- **Analytics** (16): N/A — Analytics did not affect the audited flow.
- **Performance** (17): N/A — No performance profiling was performed.
- **Security & Privacy** (19): 7/10 — Viewer secret controls and copy-audit failure paths were tested; this is not a security audit.

## Recommended Next Sprint

**Priority 1:** Validate the Application topology with representative organization data, including shared and long-named records, before VM deployment.

**Priority 2:** Add a delayed-chunk regression for the Asset form and complete the loading/empty/error matrix for the six scoped routes.

**Priority 3:** Confirm whether Application completeness is intentionally limited to profile and topology fields; the code currently excludes access points and the UI names the metric `Profile & topology`.
