## Parent

#4 — Spec: V1 internal infrastructure inventory

## What to build

Deliver the Application-centered inventory spine: users can create an Application, define PROD/UAT/TEST Environments and team-managed Components, record ownership and Application Access, and understand the complete topology from one detail view.

## Acceptance criteria

- [ ] Users can list, search, filter, create, view, and edit Applications according to role.
- [ ] Application name is unique; Technical Owner and Business Unit have distinct labels and behavior.
- [ ] Users can add PROD, UAT, and TEST Environments, with PROD visibly selected by default in new flows.
- [ ] Users can create, rename, order, and remove team-defined Components without a fixed global role list.
- [ ] Application detail presents Environment sections and Component topology through the approved full-page template.
- [ ] An Environment supports an explicit `No Database` declaration.
- [ ] Application Access supports labeled URL/address, method, and one or more encrypted credentials.
- [ ] Viewer cannot reveal Application credentials; Editor and Administrator can reveal them and each reveal/copy is audited.
- [ ] A PROD Application's completeness follows ADR 0029 and exposes exact missing context without blocking initial creation.
- [ ] Application uses archive and Administrator restore; relationships and audit history survive both actions.
- [ ] List, Detail, and Dialog surfaces use shared templates in Light/Dark and responsive layouts.
- [ ] Complete browser journeys verify create, progressive completion, access reveal, archive, archived lookup, and restore with persisted data.

## Blocked by

- #6 — V1-02: Rebuild the shared UI system and Dashboard summary.
- #7 — V1-03: Complete authentication, users, and audit journeys.
