## Parent

#4 — Spec: V1 internal infrastructure inventory

## What to build

Deliver one permission-safe Global Search Command Palette that lets the team locate Applications, Assets, VMs, Database records, and Documents from any page and navigate directly to the selected detail.

## Acceptance criteria

- [ ] A consistent Topbar search entry opens through pointer interaction and `Ctrl+K`.
- [ ] Results are grouped as Applications, physical Assets, VMs, Database Instances or Logical Databases, and Documents.
- [ ] Search matches the accepted safe identifiers, including names, hostnames, IPs, asset IDs, serial numbers, Database names, and Document titles.
- [ ] Selecting a result closes the palette and opens the correct detail view.
- [ ] Results respect archive visibility and role-safe projections.
- [ ] Usernames, passwords, tokens, and secret values are neither searchable nor returned in result metadata.
- [ ] Loading, no-result, error, keyboard focus, escape, and screen-reader behavior use the shared Command pattern.
- [ ] Desktop, Tablet, and Mobile browser journeys verify search and navigation from multiple starting routes.

## Blocked by

- #9 — V1-05: Connect Hardware Assets to Application topology.
- #10 — V1-06: Complete the vCenter and VM Inventory lifecycle.
- #11 — V1-07: Model Database Instances and Logical Databases.
- #12 — V1-08: Link canonical Documents and preserve direct sharing.

