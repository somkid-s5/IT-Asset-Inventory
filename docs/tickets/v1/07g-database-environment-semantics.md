# 07g — Database Environment Semantics

## Goal
Align Database Environment with the accepted V1 operational vocabulary.

## Decision
The authoritative V1 Database Environment values are:
- `PROD`
- `UAT`
- `TEST`

This follows ADR 0004, the Domain Model, Glossary, and V1 specification.

## Requirements
- New Database UI exposes only `PROD`, `UAT`, and `TEST`.
- New Database records visibly default to `PROD` in the form.
- API normalizes case/whitespace and rejects new unsupported values such as `DEV` or `DR`.
- Existing legacy values are not silently rewritten. An unchanged legacy value may survive an edit until an explicit migration decision is made.
- Database list/filter types and tabs expose all and only the V1 values.
- Data Quality treats missing Environment as context debt; it does not manufacture a value.

## Acceptance
- `prod`, `UAT`, and `test` normalize to their canonical uppercase values.
- New `DEV`/`DR` inputs are rejected.
- An unchanged legacy `DEV` value can be preserved during edit.
- Frontend filter tabs include PROD/UAT/TEST and no DEV/DR option.
