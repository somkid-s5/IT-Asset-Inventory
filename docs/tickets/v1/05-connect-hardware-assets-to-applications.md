## Parent

#4 — Spec: V1 internal infrastructure inventory

## What to build

Deliver a consistent Hardware Asset journey that preserves the useful Host and Management access workflow, links Assets to Application Components, supports honest incomplete records, and retains history through archive and restore.

## Acceptance criteria

- [ ] Users can list, search, filter, create, view, and edit physical Assets according to role.
- [ ] Name and type are the minimum identity; optional asset ID and serial number are unique when present.
- [ ] Missing operational context produces `Needs Context` with exact missing-field guidance without blocking creation.
- [ ] One Primary Application relationship is prominent and additional shared Application Component relationships remain available.
- [ ] Host and Management Access Points retain node, method, IP/address, version, and multiple credential accounts.
- [ ] Access Point-to-Credential relationships are explicit and no longer reconstructed from duplicated display fields.
- [ ] Viewer cannot reveal credentials; Editor and Administrator can reveal and each reveal/copy is audited.
- [ ] Asset uses archive and Administrator restore; Access Points, credentials, Application links, Documents, notes, attachments, and history survive.
- [ ] Existing Import and Bulk Update actions are removed; ordinary CSV export is superseded by the Sensitive Inventory Export.
- [ ] Asset List, Detail, and Dialog surfaces use shared templates in both themes and approved responsive behavior.
- [ ] Browser journeys verify progressive creation, both access layers, Application linking, credential access, archive, restore, and persistence.

## Blocked by

- #8 — V1-04: Deliver Application topology and access.

