# 09a — Global Search Safe Result Contract

## Parent

Ticket 09 — Deliver Global Search Command Palette

## Problem

Global Search already queried several inventory domains, but result behavior was not trustworthy:

- Asset search excluded `DECOMMISSIONED` instead of `ARCHIVED`, so archived Assets could still appear.
- Database Logical Database matches returned only the parent Database row, hiding which Logical Database matched.
- Safe identifiers could be matched server-side but then removed by cmdk client filtering because `CommandItem.value` contained only a subset of identifiers.
- Search projections needed an explicit no-secret contract.

## Contract

- Backend search is the authoritative filter; the command component must not re-filter server results.
- Archived Applications, Assets, VMs, Database Instances, and Logical Databases are excluded from default Global Search.
- Decommissioned-but-not-archived Assets remain searchable as historical inventory.
- Logical Databases are returned as a distinct result group and navigate to their parent Database detail.
- Search accepts safe identifiers including names, host/system names, IPs, Asset IDs, serial numbers, Database/Logical Database names, service names, and Document titles/content.
- Result projections never include usernames, passwords, tokens, encrypted secrets, or credential records.
- Search is authenticated by default and has no public decorator.

## Verification gate

Focused SearchService projection/archive tests, frontend lint/TypeScript, and Global Search browser acceptance compile gate must pass before this slice is accepted.
