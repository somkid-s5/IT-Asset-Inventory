# 07f — Server-side Database List

## Goal
Make Database inventory scale beyond 1,000 records without silently hiding data.

## Requirements
- `GET /databases` accepts `page`, `limit`, `q`, `environment`, `includeArchived`, `sortBy`, and `sortDir`.
- Query the requested page only and return `data`, `total`, `page`, `limit`, and `totalPages`.
- Database list uses an explicit lightweight projection; deep Logical DB/Application relations, Documents, and account rows stay detail-only.
- Search/filter/sort execute on the server, not only against the currently loaded page.
- Environment counts reflect the server-side filtered inventory, not the current page.
- Frontend TanStack table uses manual pagination/sorting and displays the server total.
- Existing consumers of `/databases` are updated for the paginated response or moved to a dedicated lookup endpoint.

## Acceptance
- Inventory record 1001+ remains discoverable by page/search.
- Changing search/environment/archive filters resets to page 1.
- Requested page size is capped at 200.
- Backend focused contract tests prove pagination metadata and lightweight projection.
- Frontend lint/typecheck pass.
