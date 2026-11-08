---
name: release-readiness-gate
description: Assess a change's delivery readiness against requirements, implementation evidence, tests, security, performance, and known risks when asked for a release review.
---
# Release Readiness Gate

1. Identify the change scope and acceptance criteria from the request, issue, or repository docs; call out missing criteria.
2. Review the diff and relevant implementation for requirement coverage, regression risk, data migration/state handling, security-sensitive paths, and proportionate performance risks.
3. Run checks requested by the user or required by repository instructions. Record exact commands and results; never infer a pass from code inspection.
4. Mark each gate Pass, Concern, Blocked, or Not assessed, with evidence and impact. Missing evidence is not a pass.
5. Give a concise release recommendation and the smallest actions needed to resolve blockers or material concerns.

This review does not deploy, publish, merge, or change external systems; those need a separate explicit request.
