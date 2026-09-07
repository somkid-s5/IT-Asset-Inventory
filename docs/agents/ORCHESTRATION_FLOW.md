# IT-Asset-Inventory Agent Orchestration Flow

## Goal
Turn the existing app into a production-usable operational inventory system, not a demo/prototype. Preserve the current architecture unless a reviewed requirement justifies change.

## Main flow
1. `grill-with-docs`
2. `prd-plan`
3. `product-design-and-ux`
4. `production-app-completeness` (pre-spec gate)
5. `to-spec`
6. `to-tickets`
7. `implement` + `tdd`
8. `code-review`
9. `production-app-completeness` (post-implementation gate)

## Agent roles
- **Orchestrator**: owns scope, dependencies, acceptance/rejection, and prevents uncontrolled rewrites.
- **Product/Data Auditor**: maps domain entities, fields, relationships, provenance, lifecycle, and downstream consumers.
- **UX Auditor**: maps IA, user tasks, table/form behavior, states, permissions, errors, and recovery.
- **Vertical Slice Implementer(s)**: implement one narrow complete slice across schema/API/UI/tests.
- **Reviewer**: checks repository standards and spec fidelity independently.
- **Completeness Reviewer**: traces requirement -> data -> API -> UI -> tests and blocks AI-slop completion claims.

## Hard rules
- Do not rewrite the architecture merely to simplify implementation.
- Do not implement a table/page until purpose, fields, relationships, states, permissions, and downstream usage are defined.
- Do not declare a feature complete from visual rendering alone.
- Do not use fake/static production-path data as completion evidence.
- Test with realistic multi-record datasets, not only 1-3 trivial rows.
- Tickets must be vertical slices that cross schema/API/UI/tests where applicable.
- UI authorization never substitutes for backend authorization.
- Existing project E2E conventions in `AGENTS.md` are mandatory.
- Prefer reversible, reviewable changes and small commits.

## Model policy for local Codex workers
- Use GPT-5.6 Luna High for implementation workers, routine ticket execution, and coding-heavy vertical slices.
- Product/Data Auditor, UX Auditor, Reviewer, Completeness Reviewer, and architecture/spec-vs-code audit roles may use GPT-5.6 Sol when deeper reasoning materially improves review quality.
- Do not silently upgrade ordinary implementation workers to Sol; Sol is reserved for audit/review reasoning unless the user explicitly changes this policy.
- The ChatGPT orchestrator may review outputs, choose Luna vs Sol by role, and re-task workers.

## First mission
Audit the current application before feature work. Produce evidence-backed findings for:
- screens that look implemented but lack real operational depth;
- tables with insufficient or unjustified fields;
- missing schema/API/UI relationships;
- dead-end data with no downstream consumer;
- missing list/detail/create/edit flows;
- missing loading/empty/error/permission/integration states;
- unrealistic seed/demo data;
- gaps between README/DESIGN/schema/API/frontend/E2E behavior.

Do not fix everything during the audit. Convert validated findings into an ordered plan of vertical slices.
