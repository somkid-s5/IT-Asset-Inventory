# 08a — Public Document Known-Link Boundary

## Parent
Ticket 08 — Link canonical Documents and preserve Direct Document Links.

## Goal
Keep anonymous sharing narrow: a known Document ID may render read-only, while authenticated document detail remains the only surface that returns inventory relationships and richer author metadata.

## Requirements
- Keep `/knowledge-base/documents/:id` authenticated.
- Expose a dedicated public known-link endpoint with a strict projection.
- Public projection includes only Document content plus minimal category/author display metadata.
- Do not expose Application, Asset, VM, Database relationship metadata, VM IPs, author username, credentials, or collection navigation through the public response.
- Increment view count without changing the public projection.

## Acceptance
- Public endpoint works for a known UUID.
- Authenticated detail endpoint is not marked public.
- Public response does not contain inventory relationship collections or author username.
- Category/document/search/recent enumeration handlers remain authenticated.
