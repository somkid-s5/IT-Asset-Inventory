# 06e — Lossless VM Promotion

## Problem found by audit
`promoteDiscovery()` deletes any existing `VmInventory` for the discovery and recreates it. A repeated promote request can therefore destroy inventory-level relationships, documents, and history. Partial promote payloads can also overwrite curated Discovery fields with empty defaults and can drop saved guest accounts unless every field is resubmitted.

## Required behavior
- Promotion is a one-way transition from Discovery to Inventory. If an Inventory already exists for the Discovery, reject the request and direct callers to edit Inventory instead.
- Never delete/recreate an existing VM Inventory during promotion.
- Merge partial promote input with curated Discovery context for owner, environment, business unit, SLA tier, service role, criticality, description, notes, tags, and guest accounts.
- If guest accounts are omitted from the promote request, copy the already-encrypted Discovery guest accounts into Inventory without exposing/decrypting secrets.
- Source-owned VM facts and disks always come from the Discovery record.
- Promotion always creates an ACTIVE lifecycle record; Data Quality is represented separately by `discoveryState` / missing fields.
- `lastSyncAt` comes from the Discovery `lastSeenAt`, not from the human promotion timestamp.
- Promotion must not rewrite the Discovery creator.

## Acceptance tests
- Re-promoting an already promoted discovery is rejected and no inventory delete occurs.
- Partial promotion preserves Discovery curated fields and guest accounts.
- Promoted disks and last-sync evidence come from Discovery/vCenter data.
- Missing Application context does not block promotion; it produces Needs Context when other required context is missing.
