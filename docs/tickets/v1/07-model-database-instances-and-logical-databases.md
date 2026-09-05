## Parent

#4 — Spec: V1 internal infrastructure inventory

## What to build

Deliver a two-level Database inventory where each Database Instance records its host and service facts, contains Logical Databases linked to Application Components, and manages non-duplicated account scope and credentials.

## Acceptance criteria

- [ ] Users can list, search, filter, create, view, and edit Database Instances according to role.
- [ ] Display name, engine, and host or related compute identity form the minimum Instance identity; missing context produces `Needs Context` rather than guessed values.
- [ ] A Database Instance can relate to the VM or physical Asset that hosts it.
- [ ] Users can create multiple uniquely named Logical Databases within an Instance.
- [ ] Logical Databases link to one or more Application Components and navigate in both directions.
- [ ] A Database Account belongs once to an Instance and is either instance-wide or scoped to selected Logical Databases.
- [ ] Account credentials follow permission-gated reveal, copy audit, safe projection, and secret sanitization.
- [ ] Database Instances and Logical Databases use archive and Administrator restore without losing accounts, relationships, notes, Documents, or history.
- [ ] Database List, Detail, and Dialog surfaces use the shared templates in both themes and approved responsive behavior.
- [ ] Browser journeys verify one Instance with several Logical Databases, Application links, both account scopes, credential access, archive, restore, and persistence.

## Blocked by

- #8 — V1-04: Deliver Application topology and access.

