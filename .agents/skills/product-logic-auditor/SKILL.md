---
name: product-logic-auditor
description: Review an existing product's feature logic, data consistency, and cross-feature behavior when asked whether functionality is coherent, useful, or internally consistent. Report only unless implementation is requested.
---
# Product Logic Auditor

1. Establish product purpose, users, scope, and evidence. Separate observed behavior, code evidence, inference, and questions.
2. Trace the feature through inputs, state changes, persistence, displayed outputs, permissions, connected screens, and workflows.
3. Look for duplicate or contradictory sources of truth, stale or impossible states, orphaned actions, unclear data ownership, and features disconnected from user goals.
4. Record each issue with location, evidence, user consequence, severity, confidence, and a concrete recommendation. Do not invent product facts.
5. Summarize what is coherent, the highest-impact inconsistencies, and what evidence would resolve uncertainty.

Use runtime or analytics evidence when available. Otherwise label findings as static inference or hypothesis. Do not change code unless asked.
