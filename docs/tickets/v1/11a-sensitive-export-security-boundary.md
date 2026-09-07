# 11a — Sensitive Export Security Boundary

## Goal

Make Sensitive Inventory Export an Administrator-only, re-authenticated, server-confirmed operation whose passphrase is never persisted or logged.

## Contract

- API route requires ADMIN.
- Current account password is verified immediately before workbook generation.
- Passphrase + confirmation are validated server-side.
- Response uses no-store/private cache headers.
- Audit records actor/action/timestamp metadata only after encrypted output generation succeeds.
- UI exposes the action only to Admin and offers no unencrypted secret export.

## Evidence

Focused controller tests cover role metadata, mismatch rejection, re-authentication, response headers, and generation call contract.
