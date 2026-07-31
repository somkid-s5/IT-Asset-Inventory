# Production deployment runbook

## Release gate

- Run `npm run build` and `npm test -- --runInBand` in `backend`.
- Run `npm run lint` and `npm run build` in `frontend`.
- Verify login, asset create/edit/delete, CSV export, bulk update, attachment download, VM source test/sync, and the Dashboard Needs Review summary against staging.
- Confirm that `FRONTEND_URL`, `JWT_SECRET`, `CREDENTIAL_ENCRYPTION_KEY`, `REGISTRATION_SECRET`, `VCENTER_ALLOWED_HOSTS`, and the default seed passwords are explicit production values. Do not use placeholders. Confirm `VCENTER_MOCK_ENABLED` is `false` or unset.

## Database backup and migration

1. Put the application in maintenance mode and take a verified PostgreSQL backup.
2. Restore that backup to staging and run `npx prisma migrate deploy` there first.
3. Review the two intentional migration effects:
   - `20260524110719_rename_article_to_doc` was historically destructive. Do **not** apply it to a database with `KnowledgeArticle` data without first exporting that data and rehearsing a copy/rename migration.
   - `20260712150000_remove_ticketing` intentionally removes Ticket, TicketComment, and Client data and related audit rows because ticketing is no longer part of the product.
4. After staging verification, run `npx prisma migrate deploy` once in production and retain the backup until post-release checks pass.

## Post-release checks

- Open the Dashboard and confirm the Needs Review count for Assets, Databases, and VMs matches the expected inventory.
- Confirm CSV export contains the current asset view and does not expose credential values.
- Confirm an unauthenticated attachment URL is rejected and a signed-in download works.
- Confirm vCenter endpoints are HTTPS and match `VCENTER_ALLOWED_HOSTS`.
- Verify `/api/health/live` returns 200 and `/api/health/ready` returns 200 with database status `ok`.
- Review Audit Logs for the release window.
