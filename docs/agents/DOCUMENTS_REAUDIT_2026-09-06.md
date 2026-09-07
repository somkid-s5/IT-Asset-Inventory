# Ticket 08 Re-Audit — Canonical Knowledge Documents

Date: 2026-09-06
Scope: Ticket 08 / canonical Knowledge Base Documents and Direct Document Links
Method: requirement → schema/service/API → authenticated UI → public UI → inventory surfaces → focused tests → browser acceptance spec

## Verdict

**CODE-COMPLETE FOR THE AUDITED TICKET 08 SCOPE / RUNTIME ACCEPTANCE PENDING.**

Do not mark Ticket 08 fully done until the runtime browser/API matrix is executed against a real seeded application stack.

## Acceptance matrix

### Authenticated browsing/search/categories

PASS at code/static level.

- Category/list/recent endpoints remain authenticated.
- Added authenticated full-library search endpoint instead of filtering only the ten recent Documents.
- Search covers title/content/category and uses a bounded lightweight projection.
- Viewer can browse/read but cannot author.

Runtime browser evidence: pending.

### Editor/Admin authoring

PASS at code/static level.

- Create/update/upload endpoints remain ADMIN/EDITOR protected.
- Viewer Create controls are hidden.
- Direct Viewer authoring-route access redirects to read-only Document destinations; backend authorization remains authoritative.

Runtime browser evidence: pending.

### Canonical links to Application / Asset / VM / Database

PASS at code/static level.

- KnowledgeDocument owns explicit join relations for all four inventory types.
- Authenticated Document detail displays Related Inventory and navigates to each canonical inventory detail surface.
- Application/Asset/VM/Database detail surfaces display Canonical Documents and navigate to authenticated `/dashboard/docs/:id` rather than the public read-only route.
- Seed `Getting Started` is linked to deterministic Application, Asset, VM, and Database fixtures.

Runtime navigation evidence: pending.

### Direct known-link anonymous Document access

PASS at API-contract/static level.

- Authenticated `GET /knowledge-base/documents/:id` is no longer public.
- Dedicated `GET /knowledge-base/public/documents/:id` is the anonymous known-link endpoint.
- Public projection includes only Document content, minimal category, display author, and timestamps.
- Public projection excludes Application/Asset/VM/Database relationships, VM primary IP, author username, inventory metadata, and credentials.
- Copy Public Link produces `/docs/:id` and handles clipboard failure rather than reporting false success.

Runtime anonymous access evidence: pending.

### Public Document images

PASS at code/static level.

- Image upload is ADMIN/EDITOR only.
- Upload validates allowed MIME/signature, size, and rejects SVG.
- Files receive generated UUID filenames under the KB upload directory.
- Public image serving constrains the resolved filename with `path.basename()` and serves only from `uploads/kb`.

Runtime anonymous image journey: pending.

### Anonymous enumeration resistance

PASS at controller contract level.

The following remain authenticated:

- categories
- category detail
- Document list
- recent Documents
- Document search
- authenticated full Document detail

Public surface is limited to known Document ID and KB image filename routes.

Runtime unauthenticated HTTP rejection evidence: pending.

### Public read-only presentation

PASS at frontend static level.

Removed unsupported/deceptive UI:

- `Verified System Document`
- `Secure Operations Center`
- unsupported "official"/distribution security claims
- dead public Share/Save controls
- dead authenticated Bookmark/Report Outdated controls

Public page now describes itself neutrally as a shared read-only Knowledge Base Document and exposes no authenticated inventory navigation.

### Sensitive Inventory Export

No new Document content or attachment export path was introduced by Ticket 08 remediation. Existing inventory export remains separate from Knowledge Document content/attachments.

Runtime/export regression: pending as part of broader acceptance matrix.

## Remediation slices

- 08a — Public Document Known-Link Boundary
- 08b — Canonical Document ↔ Inventory Navigation
- 08c — Authenticated Full-Library Search
- 08d — Document Authoring RBAC and Public Safety

## Latest verification evidence

Backend Knowledge Base focused gate:

- 2 suites pass
- 5 tests pass
- TSC 0 issues
- 117 backend files compile

Frontend Documents gate:

- Prettier/ESLint pass on patched Document surfaces
- TypeScript pass
- `documents-v1-acceptance.spec.ts --list` passes

Browser acceptance spec discovers:

1. authenticated full-library search + related inventory + copied public known link + anonymous enumeration rejection,
2. authenticated image upload followed by anonymous valid KB image retrieval,
3. Viewer read-only behavior and direct-edit-route protection.

## Remaining gates

- Execute runtime Playwright suite.
- Execute anonymous API matrix against running backend.
- Execute deterministic seed against real test DB.
- Confirm persistence across service restart.
- Re-run export regression against running stack.
- Do not call Ticket 08 fully done until these environment-dependent gates pass.
