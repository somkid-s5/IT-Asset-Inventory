# 07b — Database Account Identity, Secret Preservation, and Scope

## Goal
Make Database Accounts stable, non-duplicated, and safe to edit without secret loss.

## Requirements
- Account identity is stable across edits; do not delete/recreate every account.
- Add account `id` to update contract and preserve encrypted password when password is omitted/blank for an existing account.
- Enforce unique username per Database Instance.
- Account scope is controlled: `INSTANCE` or `LOGICAL_DATABASES`.
- `INSTANCE` requires no logicalDatabaseIds.
- `LOGICAL_DATABASES` requires one or more logicalDatabaseIds belonging to the same Instance.
- New account requires an explicit password unless product policy permits an intentionally empty secret.
- Safe detail projection never returns plaintext/encrypted password.
- Reveal/copy remains ADMIN/EDITOR only and audited.
- Removing an account must be an explicit user action, not a side effect of partial Instance PATCH.

## Acceptance
- Edit owner/notes without sending accounts -> accounts and secrets unchanged.
- Edit account role/privileges with blank password -> existing secret unchanged.
- Duplicate username in one Instance -> rejected with a readable error.
- Same username in different Instances -> allowed.
- Invalid scope combinations -> rejected.
- Reveal/copy audit behavior remains green.
