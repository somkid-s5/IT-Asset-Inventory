# 09c — Global Search Responsive Browser Contract

## Parent

Ticket 09 — Deliver Global Search Command Palette

## Purpose

Turn the Global Search acceptance criteria into deterministic browser journeys across desktop, tablet, and mobile without relying on secrets or unstable result ordering.

## Browser matrix

### Desktop

- Open from an arbitrary authenticated route with `Ctrl+K`.
- Search by Asset ID, serial number, and IP and navigate to the Asset detail.
- Search a Logical Database and verify it appears under its own group, then navigate to the parent Database detail.
- Search a Document title and navigate to authenticated Document detail.
- Selecting a result closes the palette.

### Tablet

- Open using the visible topbar search control.
- Search a VM or Database safe identifier and navigate correctly.
- Verify grouped result labels remain usable at tablet width.

### Mobile

- Open using the compact icon button.
- Input receives focus.
- Search and navigate to an Application/Asset result.
- Escape/close works without horizontal overflow.

### State coverage

- Delayed search request shows the loading status.
- Forced API failure shows `Search unavailable` and retry.
- Unique unmatched query shows a genuine no-result state rather than an error state.

## Runtime gate

The Playwright spec is first required to compile/list without starting the development stack through Serena. Runtime execution remains pending until the stack can be launched through a control path that does not hold the Serena tunnel request open.
