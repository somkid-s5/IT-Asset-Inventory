## Parent

V1.1 Consistency, Data Integrity, and Realistic Acceptance

## Findings

VCS-001, VCS-002, VCS-003, AUD-002.

## What to build

Make vCenter Source editing credential-preserving and align Source audit actions with actual lifecycle operations.

## Acceptance criteria

- [ ] Source Edit never loads an existing password value into the browser.
- [ ] Safe response exposes whether reusable credentials are configured without exposing the secret.
- [ ] Blank password on Edit preserves the existing encrypted password.
- [ ] Metadata-only changes (for example Name/Sync Interval/Notes) can save without credential re-entry when endpoint/credential identity is unchanged.
- [ ] Endpoint, username, or password changes require a successful connection test for the exact connection-affecting values before Save.
- [ ] Changing metadata after a successful test does not invalidate the test unless connection-affecting fields changed.
- [ ] Create Source logs CREATE_SOURCE.
- [ ] Update Source logs UPDATE_SOURCE.
- [ ] Manual sync logs VCENTER_SYNC.
- [ ] Archive/Restore use explicit lifecycle actions; add schema enum values/migration if necessary instead of labeling Archive as Delete or Restore as Sync.
- [ ] Source list actions adopt Ticket 01 shared action grammar while keeping Sync as a domain-specific frequent action.
- [ ] Viewer remains read-only; Editor/Admin permissions remain consistent with the accepted Source RBAC contract.
- [ ] Browser acceptance covers create/test, metadata-only edit, connection-affecting edit, sync, archive, restore, and audit evidence.

## Security notes

Do not log passwords, decrypted credentials, session tokens, or connection response secrets. Preserve the current HTTPS-only source requirement.

## Blocked by

- Ticket 01
- Ticket 02

Coordinate audit enum/taxonomy migration with Ticket 12.
