# ADR 0018: Use English for Product Interface Copy

- Status: Accepted
- Date: 2026-09-04

## Context

The product uses established System Administration concepts whose English names match the team's infrastructure tools. Mixing interface languages would make labels and operational terminology inconsistent.

## Decision

Product-controlled interface copy uses English consistently, including:

- navigation and page titles;
- buttons and field labels;
- validation, empty, loading, error, and confirmation messages;
- status labels and audit action descriptions.

Team-authored inventory values, notes, and Documents may contain Thai or English as appropriate.

## Consequences

- Shared components own repeated interface vocabulary where practical.
- New UI work must not mix Thai and English labels for the same concept.
- Internationalization infrastructure is not required for V1.

