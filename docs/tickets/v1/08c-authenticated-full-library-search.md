# 08c — Authenticated Full-Library Document Search

## Parent

Ticket 08 — Canonical Knowledge Base Documents and Direct Document Links

## Problem

The Knowledge Base home page labeled its input as search but only filtered category names plus the ten most-recent Documents already loaded by the page. Valid Documents outside that recent window could not be found from the primary search surface.

## Contract

- Search is authenticated; anonymous callers cannot enumerate Documents through this endpoint.
- Search spans the canonical Knowledge Document library, not only recent results.
- Search matches title, content, and category name.
- Search returns a lightweight Document projection suitable for result cards and does not load inventory relationships or credentials.
- Empty search terms return no global-search results rather than enumerating the entire library accidentally.
- Result volume is bounded.

## Implementation

- Added `GET /knowledge-base/search/documents?q=`.
- Added `KnowledgeBaseService.searchDocuments()` using server-side Prisma filtering and a lightweight projection.
- Knowledge Base home switches to full-library search results when a query is present while retaining the recent-document view when no query is present.

## Verification

- Controller metadata contract verifies the search handler is not public.
- Backend Knowledge Base focused tests and build pass.
- Frontend Knowledge Base lint and TypeScript checks pass.
- Browser acceptance spec includes full-library search behavior and anonymous enumeration rejection.

## Runtime gate

Full browser execution remains pending until the application stack is run outside the Serena control request path.
