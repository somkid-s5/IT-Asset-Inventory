## Parent

V1.1 Consistency, Data Integrity, and Realistic Acceptance

## Findings

DOC-001, DOC-002, SCL-001.

## What to build

Migrate Knowledge Document inventory linking to the shared server-authoritative relation picker and remove partial-dataset local search behavior.

## Acceptance criteria

- [ ] Document create/edit relation UI uses Ticket 03 picker for Applications, Assets, VMs, and Databases.
- [ ] Record beyond historical Asset/Database 200 boundary can be found and linked.
- [ ] Record beyond historical VM 1000 boundary can be found and linked after Ticket 08.
- [ ] Existing selected links remain visible during search/paging.
- [ ] Archived records are not offered for new linking; pre-existing archived links remain visible with Archived context.
- [ ] Picker failure shows Error + Retry and never `No matching records` for an unavailable request.
- [ ] Safe option projections exclude credentials, usernames, passwords, and secret material.
- [ ] Save/reload preserves all selected canonical links.
- [ ] Reverse navigation from linked inventory back to the Document remains green.
- [ ] Public known-link Document projection remains unchanged and does not expose related inventory.

## Blocked by

- Ticket 03
- Ticket 08 for final VM >1000 boundary proof
