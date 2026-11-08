---
name: insecure-defaults
description: Review a codebase for insecure default configuration such as fallback secrets, default credentials, fail-open security switches, weak cryptography, permissive access, and exposed debug features when a security review is requested.
---
# Insecure Defaults Review

Treat search matches as candidates, not findings, until traced to a reachable security decision.

1. Confirm the requested scope exists; identify languages, configuration accessors, deployment manifests, and exclusions.
2. Search for fallback secrets, seeded credentials, fail-open authentication/authorization switches, weak cryptographic defaults, permissive access, and debug exposure. Adapt searches to project-specific configuration wrappers.
3. Trace each candidate: production reachability, selected value, deployment overrides, and whether it reaches a security decision. Cite source and sink.
4. Refute test-only, unreachable, secure-by-construction, or reliably overridden candidates. State uncertainty if deployment evidence is incomplete.
5. Report confirmed findings separately from refuted candidates and coverage gaps, with severity, evidence, impact, and remediation. No search matches is not proof of absence.

Do not run project code, install dependencies, or change configuration unless separately requested. Label limits clearly.
