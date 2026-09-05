## Parent

#4 — Spec: V1 internal infrastructure inventory

## What to build

Deliver the complete vCenter-to-VM Inventory lifecycle: configure a source, discover and promote known or unknown VMs, preserve Curated Context during synchronization, retain VMs deleted in vCenter, and connect VMs to Application Components when known.

## Acceptance criteria

- [ ] Editor and Administrator can add, test, edit, sync, and archive a permitted HTTPS vCenter Source; Viewer receives only the allowed safe projection.
- [ ] Discovery identity is stable per vCenter Source and repeated synchronization does not duplicate VMs.
- [ ] A user can promote a VM without Application context; it enters Inventory as `Needs Context` rather than remaining blocked.
- [ ] A user can assign one Primary Application Component and additional shared relationships later.
- [ ] Synchronization refreshes vCenter-owned identity, name, power, CPU, memory, guest OS, IP, and disk facts.
- [ ] Synchronization never overwrites Application, Component, Environment, ownership context, Criticality, credentials, notes, or Documents.
- [ ] A missing VM becomes `DELETED_IN_VCENTER` with all Curated Context and history preserved.
- [ ] An Administrator can archive and restore a VM without losing vCenter identity or relationships.
- [ ] VM guest credentials remain distinct from vCenter Source credentials and follow reveal/audit permissions.
- [ ] VM list, source, discovery, and detail surfaces use the shared UI system and clearly distinguish lifecycle from Data Quality.
- [ ] Deterministic integration and browser journeys verify source setup, sync, unknown promotion, later curation, drift refresh, deletion preservation, archive, restore, and persistence.

## Blocked by

- #8 — V1-04: Deliver Application topology and access.

