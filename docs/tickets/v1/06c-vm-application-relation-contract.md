## Parent
Ticket 06 — Complete vCenter and VM Inventory lifecycle

## Goal
Make VM-to-Application Component relationships explicit and enforce the Ticket 06 Primary/Shared invariant.

## Problem found by audit
VM promotion/update accepts only `componentIds`. `ApplicationComponentVm.relationType` defaults to `PRIMARY`, so multiple linked components can silently become multiple Primary relationships. Application topology writes VM links through `vmIds` and has the same default-driven ambiguity.

## Required behavior
- Introduce structured VM `componentLinks` entries with `componentId`, `relationType: PRIMARY|SHARED`, and optional `responsibleParty`.
- A VM may have at most one PRIMARY Component relationship and zero or more SHARED relationships.
- Duplicate/unknown components are rejected.
- Keep legacy `componentIds` compatibility temporarily; map first occurrence PRIMARY and later occurrences SHARED.
- Application topology writes must also preserve the one-primary invariant: first relationship becomes PRIMARY only if the VM has no Primary elsewhere, otherwise SHARED.
- VM Form/Detail clearly separates Primary from Shared and includes Application → Environment → Component context.
- Sync never changes these links.

## Acceptance evidence
- Backend relation contract tests: primary+shared, duplicate, multi-primary, unknown component, legacy mapping.
- Application topology relation tests prevent duplicate Primary relationships.
- Browser journey promotes without links, then later assigns Primary + Shared and verifies persistence/navigation.
