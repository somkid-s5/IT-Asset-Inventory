# Ticket 09 Re-Audit — Global Search Command Palette

Date: 2026-09-06
Scope: Ticket 09 / permission-safe Global Search Command Palette
Method: acceptance criteria → SearchService projections → command UI behavior → safe identifiers → archive semantics → responsive browser spec

## Verdict

**CODE-COMPLETE FOR THE AUDITED TICKET 09 SCOPE / RUNTIME BROWSER ACCEPTANCE PENDING.**

Do not mark Ticket 09 fully done until the desktop/tablet/mobile Playwright journeys execute against a running seeded stack.

## Acceptance matrix

### Topbar entry + Ctrl+K

PASS at frontend static/compile level.

- Desktop/tablet topbar pointer entry uses `GlobalSearch`.
- Compact mobile topbar entry uses the same component/state.
- `Ctrl+K`/`Meta+K` opens the same palette.
- Search input auto-focuses.
- Escape closes through the shared Dialog/Command pattern.
- Closing clears the stale query.

Runtime browser evidence: pending.

### Grouped results

PASS at code/static level.

Groups are explicit:

- Applications
- Assets
- Virtual Machines
- Database Instances
- Logical Databases
- Documents

Logical Database matches are no longer hidden behind a parent Database result; they display the Logical Database name plus parent Database/engine context and navigate to the parent Database detail.

### Safe identifiers

PASS at backend contract level.

Search covers accepted safe identifiers including:

- Application names plus non-secret ownership context,
- Asset name / Asset ID / serial / location / IP,
- VM name / system name / primary IP / host,
- Database name / text host / IP / service name / related Asset or VM host identity,
- Logical Database name and parent Database name,
- Document title/content.

The browser fixture guarantees repeatable Asset ID / serial / IP search for `DEV-ASSET-001`, `E2E-SN-001`, and `10.0.1.45` after seed execution.

### Archive semantics

PASS at backend contract level.

- Applications: ACTIVE only.
- Assets: ARCHIVED excluded; DECOMMISSIONED-but-not-archived remains searchable historical inventory.
- VMs: ARCHIVED excluded.
- Database Instances: ARCHIVED excluded.
- Logical Databases: both Logical Database and parent Instance must not be ARCHIVED.

### Secret-safe projections

PASS at focused test level.

Search projections do not select credential/account records, usernames, password/encrypted fields, tokens, or secret values. Search controller is not public and therefore inherits authenticated access.

### Server-authoritative filtering

PASS at frontend static level.

The original palette allowed cmdk to re-filter server results using an incomplete `CommandItem.value`, causing backend matches by Asset ID/serial/IP to disappear. `CommandDialog` now exposes `shouldFilter`, and Global Search uses `shouldFilter={false}` so the backend query is the single source of truth.

### Loading / no-result / error / retry

PASS at frontend static/compile level.

- Loading: polite live `Searching inventory…` status.
- Valid no-result: separate empty state.
- Failure: `Search unavailable` alert.
- Retry: explicit button, query preserved.
- Interactive search disables automatic retry so the explicit error state is observable and user-controlled.

Runtime intercepted-request browser evidence: pending.

### Navigation

PASS at browser-spec compile level.

Selecting a result closes the palette and routes to the canonical detail surface. Logical Database selection routes to its parent Database detail because V1 has no standalone Logical Database route.

### Responsive browser matrix

`e2e/global-search-v1-acceptance.spec.ts` compiles/lists and covers:

1. Desktop Ctrl+K + Asset ID/serial/IP + Logical Database navigation.
2. Desktop loading/error/retry/no-result behavior.
3. Tablet pointer entry + VM navigation.
4. Mobile compact entry + focus + viewport bounds + Application navigation.

## Remediation slices

- 09a — Global Search Safe Result Contract
- 09b — Global Search Command States and Accessibility
- 09c — Global Search Responsive Browser Contract

## Latest verification evidence

Backend:

- Search focused suites: 2 pass
- Search focused tests: 5 pass
- TSC: 0 issues
- 119 backend files compile

Frontend:

- GlobalSearch/shared Command lint: pass
- TypeScript: pass
- Playwright compile/list: pass
- 4 Global Search browser journeys discovered under Chromium, plus auth setup projects

## Remaining gates

- Execute the responsive Playwright suite against a seeded runtime stack.
- Confirm keyboard focus/escape with actual browser runtime.
- Confirm no-secret response shape against running API.
- Confirm archived seeded fixtures are omitted in runtime integration if/when a deterministic archived fixture is added.
- Do not call Ticket 09 fully done until runtime browser acceptance passes.
