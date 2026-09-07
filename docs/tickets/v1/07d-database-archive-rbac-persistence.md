# 07d — Database Archive / RBAC / Persistence

## Goal
Prove lifecycle and credential behavior for the Database aggregate.

## Requirements
- ADMIN/EDITOR can create/edit Instance, Logical Databases, and account metadata according to Ticket 07 policy.
- Archive/restore remains Administrator-only unless parent spec is changed.
- Viewer is read-only and sees no mutation or secret actions.
- Archive/restore changes lifecycle/status only; preserve accounts, encrypted secrets, Logical DBs, Application links, host relation, notes, Documents, and audit/history.
- Restore must return the aggregate with all relations intact.
- Credential reveal/copy is ADMIN/EDITOR only and audited.

## Acceptance
- Focused service tests prove archive/restore does not delete nested relations.
- Browser journey archives/restores an Instance and verifies Logical DBs, host, accounts, Application links and Documents persist after reload.
- Viewer has no edit/archive/reveal/copy controls.
