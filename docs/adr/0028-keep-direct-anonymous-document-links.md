# ADR 0028: Keep Direct Anonymous Document Links

- Status: Accepted
- Date: 2026-09-04

## Context

Team members need to send Knowledge Base links through LINE and open them quickly while on the internal network without signing in. The current product already provides `/docs/<document-id>` links, but its public API also permits unauthenticated listing of the wider Knowledge Base.

## Decision

Every Knowledge Base Document retains an immediately available direct public link using its non-sequential identifier.

- A recipient with the URL can read that Document without Login.
- Images required to render the shared Document remain available to the shared view.
- The anonymous view is read-only and contains no application navigation or Inventory data.
- Anonymous users cannot list, browse, or search the Knowledge Base collection through public endpoints.
- Signed-in users retain the complete Knowledge Base browsing and authoring experience according to role.

V1 does not add per-Document sharing toggles or token-management UI.

## Consequences

- Existing direct-link convenience is preserved.
- Public list, category, and recent-document API access must be restricted while direct Document retrieval remains public.
- Shared-view tests must prove that an anonymous user can open a known Document URL but cannot enumerate other Documents.

