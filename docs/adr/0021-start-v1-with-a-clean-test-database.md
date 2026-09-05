# ADR 0021: Start V1 with a Clean Test Database

- Status: Accepted
- Date: 2026-09-04

## Context

The current PostgreSQL data is test-only. No production inventory, credentials, Documents, or user records require migration into the redesigned V1 domain.

## Decision

V1 may reset the existing test database and introduce a clean schema for the accepted domain model.

- Backward-compatible data migration for current test records is not required.
- The final migration chain must create a fresh V1 database deterministically.
- Development seed data must be explicitly opt-in, repeatable, and clearly identifiable as sample data.
- Production deployment must not load sample credentials or records.

## Consequences

- Application relationships and archive lifecycles can be modeled directly rather than constrained by legacy test data.
- Obsolete schema concepts may be removed cleanly.
- Verification includes creating a fresh database from migrations and confirming persistence after restart.

