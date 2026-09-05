## Parent

#4 — Spec: V1 internal infrastructure inventory

## What to build

Integrate the completed V1 slices into one coherent production candidate, remove superseded legacy presentation and obsolete product behavior, and produce deterministic full-story evidence that the internal inventory works after a fresh deployment and restart.

## Acceptance criteria

- [ ] Navigation contains only the accepted V1 modules and uses Application as the primary inventory concept.
- [ ] Every migrated route uses the shared shell, templates, semantic tokens, English Interface Copy, and approved responsive behavior.
- [ ] Superseded legacy layouts, page-specific visual systems, Import, Bulk Update, ordinary permanent-delete UI, anonymous Knowledge Base enumeration, self-registration, production default accounts, Ticketing, Clients, and Notifications are absent from the active product and contracts.
- [ ] No duplicate component wrappers, copied animation definitions, raw page-specific colors, dead routes, unused imports, or unresolved TODO markers remain in the V1 surface.
- [ ] A fresh production-equivalent database is created from migrations and the Administrator bootstrap completes successfully.
- [ ] The serialized full-story browser run covers Login; Application topology; Asset access layers; unknown VM promotion, curation, sync, and vCenter deletion; Database Instance and Logical Database scope; Documents and anonymous direct link; Global Search; Data Quality; archive and restore; role restrictions; Audit Logs; and encrypted XLSX export.
- [ ] Desktop Light, Desktop Dark, Tablet, and Mobile lookup journeys pass without critical accessibility violations or hidden required actions.
- [ ] Restart persistence proves created users, Inventory, relationships, Documents, archived state, and encrypted credentials remain usable after the stack restarts.
- [ ] Backend and frontend build, lint, unit, integration, Playwright, migration, and deployment checks all exit successfully with raw evidence retained.
- [ ] README, deployment runbook, Domain Model, Glossary, and accepted ADRs describe the final behavior without obsolete ITSM claims or unsupported commands.
- [ ] The release report maps every parent-spec user story and implementation decision to passing evidence or explicitly reports a blocker; prose alone cannot mark a failed check as passed.

## Blocked by

- #6 — V1-02: Rebuild the shared UI system and Dashboard summary.
- #7 — V1-03: Complete authentication, users, and audit journeys.
- #8 — V1-04: Deliver Application topology and access.
- #9 — V1-05: Connect Hardware Assets to Application topology.
- #10 — V1-06: Complete the vCenter and VM Inventory lifecycle.
- #11 — V1-07: Model Database Instances and Logical Databases.
- #12 — V1-08: Link canonical Documents and preserve direct sharing.
- #13 — V1-09: Deliver the Global Search Command Palette.
- #14 — V1-10: Unify Data Quality and Dashboard attention.
- #15 — V1-11: Generate the encrypted Sensitive Inventory Workbook.
- #16 — V1-12: Deploy the HTTPS IP-based Compose stack.

