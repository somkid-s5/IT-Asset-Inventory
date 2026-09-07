## Parent
Ticket 06 — Complete vCenter and VM Inventory lifecycle

## Goal
Make vCenter-owned VM facts authoritative on every synchronization while guaranteeing curated operational context is never overwritten.

## Problem found by audit
`SaveVmDraftDto.managedFields` currently allows users to mark vCenter facts such as name, primary IP, CPU, memory, storage, host, cluster, network, and power state as managed. `syncSourceData()` then skips those fields. This conflicts with Ticket 06, which requires vCenter identity/facts to refresh on every sync.

## Required behavior
- vCenter-owned fields always refresh from source: `name`, `moid`, `cluster`, `host`, `computerName`, `guestOs`, `primaryIp`, `cpuCores`, `memoryGb`, `storageGb`, `disks`, `networkLabel`, `powerState`.
- Remove the ability for normal VM curation to freeze these fields against source synchronization.
- Curated fields are never changed by sync: Application/Component links, environment, owner, business unit, SLA tier, service role/purpose, criticality, guest credentials, notes, Documents, and curated tags.
- `lastSyncAt` changes only on actual synchronization, not on a human curation edit.
- Synchronization must never change lifecycle state from ARCHIVED or otherwise revive archived data.

## Acceptance evidence
- Focused sync contract test changes source facts and proves all vCenter-owned fields refresh.
- The same test seeds curated context and proves it remains byte-for-byte unchanged.
- Test proves archived inventory is excluded from sync updates.
- Backend lint/build green.
