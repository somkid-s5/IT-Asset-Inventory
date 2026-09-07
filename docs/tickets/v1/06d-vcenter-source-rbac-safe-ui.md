## Parent
Ticket 06 — Complete vCenter and VM Inventory lifecycle

## Goal
Align vCenter Source permissions and UI actions with the V1 role contract while keeping Viewer responses free of credentials.

## Problem found by audit
Backend create/update/test/sync allow ADMIN+EDITOR, but Source archive currently allows ADMIN only even though Ticket 06 explicitly allows Editor and Administrator to archive a permitted source. Source list projection is safe, but the current frontend source page does not consume role state and exposes mutation controls to Viewer.

## Required behavior
- ADMIN and EDITOR can create, test, edit, sync, and archive a source.
- Restore remains ADMIN-only unless the parent spec is explicitly changed.
- Viewer can list/view only the safe source projection and cannot see source username, encrypted password, or secret material.
- Viewer UI does not render create/edit/test/sync/archive controls.
- ADMIN/EDITOR UI exposes only actions their backend role permits.
- Source archive stops automatic/manual sync until restored.

## Acceptance evidence
- Controller/service RBAC tests cover Editor archive success and Viewer mutation denial.
- Safe-projection contract test proves no username/password/encrypted fields are returned by source list/detail mappings.
- Browser Viewer source page has no mutation controls; Editor can test/sync/archive.
