## Parent

V1.1 Consistency, Data Integrity, and Realistic Acceptance

## Findings

REL-001, REL-002 and the current-data probe section of the audit.

## What to build

Create a repeatable non-destructive verifier for the deterministic acceptance dataset and the cross-domain invariants V1.1 depends on.

This is verification tooling, not an automatic repair tool.

## Acceptance criteria

- [ ] Verifier reports counts and PASS/FAIL for duplicate Primary Asset relationships.
- [ ] Verifier reports counts and PASS/FAIL for duplicate Primary VM relationships.
- [ ] Verifier detects Component ↔ VM Environment mismatch.
- [ ] Verifier detects Component ↔ Logical Database/Database Environment mismatch.
- [ ] Verifier detects Database ↔ Host VM Environment mismatch.
- [ ] Verifier detects unsupported newly-linked archived resources where that state can be identified.
- [ ] Verifier detects Application Access rows missing required Application/Environment ownership after Ticket 04 migration.
- [ ] Verifier checks duplicate/ambiguous primary Application Access per Environment.
- [ ] Verifier reports Data Quality fixture expectations without treating intentionally incomplete fixtures as corruption.
- [ ] Output contains identifiers/counts needed for remediation but never decrypted passwords, encrypted secret payloads, tokens, or keys.
- [ ] Tool exits non-zero on invariant failure and zero on a clean acceptance dataset.
- [ ] It can be run against an explicitly supplied acceptance/test DATABASE_URL and refuses accidental implicit production/main-DB mutation.
- [ ] No auto-fix/delete/update operation is included.

## Evidence baseline

During discovery, current DB probes returned zero for known cross-environment/multiple-primary/orphan conditions. Preserve this distinction between “current data is clean” and “the write contract used to permit invalid states.”

## Blocked by

Accepted invariant behavior from Tickets 04, 06, 07, 09, and 10. The verifier may be scaffolded earlier but final assertions follow those contracts.
