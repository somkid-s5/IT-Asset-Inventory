# ADR 0015: Use a Global Command Palette for Search

- Status: Accepted
- Date: 2026-09-04

## Context

The team may begin with an Application name, hostname, IP address, asset ID, serial number, database name, or document title. Requiring users to choose the correct module before searching slows routine lookup.

## Decision

V1 provides a Global Search entry in the Topbar. Clicking it or using `Ctrl+K` opens a shadcn Command Palette overlay.

Results are grouped by Application, VM, physical Asset, Database, and Document. Selecting a result opens its detail view. V1 does not add a separate search-results page; detailed filtering remains on each module's list page.

Global Search does not search usernames or passwords and never includes secret values in results or result metadata.

## Consequences

- The implementation reuses the existing shadcn Command component and application shell.
- Search requires one backend-facing seam that returns permission-safe grouped results.
- Keyboard and pointer interactions must both be covered by external-behavior tests.
