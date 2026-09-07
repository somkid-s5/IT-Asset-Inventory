# 08b — Canonical Document ↔ Inventory Navigation

## Parent
Ticket 08 — Link canonical Documents and preserve Direct Document Links.

## Goal
Make Knowledge Documents canonical content objects connected to inventory records without duplicating content or hiding the relationship behind schema-only links.

## Requirements
- A Document may link to multiple Applications, Assets, VMs, and Database Instances.
- Authenticated Document Detail lists related inventory with type, label, and dashboard navigation.
- Application, Asset, VM, and Database detail pages list canonical Documents and open the authenticated Document detail.
- Public shared Document view does not expose inventory topology.
- Remove dead document actions that appear interactive but have no implementation.

## Acceptance
- Document Detail shows all four inventory relationship types when linked.
- Inventory `Canonical documents` cards navigate to `/dashboard/docs/:id`.
- No duplicate Document content is created per inventory relationship.
