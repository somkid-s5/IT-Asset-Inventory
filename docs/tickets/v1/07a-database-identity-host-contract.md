# 07a — Database Identity + Host Contract

## Goal
Align Database Instance minimum identity with V1 and make the host relationship explicit.

## Requirements
- Minimum identity is `name + engine + (free-text host OR hostAssetId OR hostVmId)`.
- IP address is optional context, not a creation blocker.
- Accounts are optional at creation; missing account is Data Quality, not an invented placeholder.
- Do not manufacture host/IP/environment values.
- Validate hostAssetId / hostVmId when supplied and reject unknown IDs.
- Prefer at most one canonical compute host relation at a time; if both Asset and VM are supplied, reject as ambiguous unless product requirements explicitly allow both.
- Database Form must expose searchable Host Asset / Host VM choices and allow free-text host for non-inventoried compute.
- Database Detail must show/navigate the canonical host relation.
- Data Quality must flag `host identity` if no text/relation is present.

## Acceptance
- User can create a Needs Context Database with name + engine + valid Host VM relation and no IP/account.
- User can create using a free-text host when compute is not inventoried.
- Unknown or conflicting host IDs are rejected.
- Editing unrelated fields preserves host relations.
