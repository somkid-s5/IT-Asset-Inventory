## Parent

#4 — Spec: V1 internal infrastructure inventory

## What to build

Deliver canonical Knowledge Base Documents that link to inventory records while preserving the team's immediate read-only Direct Document Link workflow without exposing anonymous collection browsing.

## Acceptance criteria

- [ ] Signed-in users can browse and search Documents and categories; Editor and Administrator can create and edit Documents.
- [ ] A Document can link to multiple Applications, physical Assets, VMs, and Database Instances without duplicating content.
- [ ] Each related inventory detail view lists and opens its canonical Documents, and the Document shows its related inventory.
- [ ] Copying a Direct Document Link yields a URL that opens the known Document read-only without Login on the internal network.
- [ ] Images required by the shared Document render without Login through a path constrained to valid Knowledge Base content.
- [ ] Anonymous users cannot enumerate Documents, categories, recent Documents, search results, Inventory, or credentials through UI or API.
- [ ] The public view uses the shared readable theme foundation without authenticated navigation or misleading decorative security claims.
- [ ] Document content and attachments are excluded from Sensitive Inventory Export.
- [ ] Browser and API journeys prove authenticated authoring, canonical linking, anonymous known-link access, and rejected anonymous enumeration.

## Blocked by

- #7 — V1-03: Complete authentication, users, and audit journeys.
- #8 — V1-04: Deliver Application topology and access.
