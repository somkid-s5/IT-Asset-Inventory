# Database V1 Re-Audit — 2026-09-06

## Verdict

**CODE-COMPLETE FOR AUDITED TICKET 07 SCOPE / RUNTIME + MIGRATION ACCEPTANCE PENDING**

Ticket 07 must not be marked fully done until the prepared Playwright acceptance suite runs against the real dev stack and the pending Prisma migrations are exercised against the target test database.

## Acceptance trace

### Instance identity and progressive context — PASS (code/static/unit)
- Minimum identity is `name + engine + one host identity`.
- Host identity may be a host name, Physical Asset, or Virtual Machine.
- IP address and Database Account are no longer creation blockers.
- Missing operational context is surfaced as derived `Needs Context`; values are not guessed.
- Host Asset/VM lookups are lightweight and the Detail page navigates back to the related compute record.

### Operational Environment semantics — PASS (code/static/unit)
- V1 Database Environment is `PROD`, `UAT`, or `TEST`.
- New UI exposes only these values and visibly defaults new records to `PROD`.
- API normalizes case/whitespace and rejects new unsupported values such as `DEV`/`DR`.
- An unchanged legacy value is preserved during edit rather than silently rewritten.

### Logical Database identity and topology — PASS (code/static/unit)
- Logical Database remains unique within its Database Instance.
- Database Detail projects Application → Environment → Component context rather than component IDs/counts only.
- Application Detail provides reverse navigation back to `Database Instance · Logical Database`.
- Application topology uses the dedicated lightweight `/databases/logical-options` endpoint and excludes archived Logical Databases.

### Database Account identity, secret preservation, and scope — PASS (code/static/unit)
- Account identity is stable; edits update in place rather than delete/recreate.
- Blank password on an existing account preserves the encrypted secret.
- Account deletion requires explicit `removedAccountIds`.
- Username is unique per Database Instance.
- Scope is canonical `INSTANCE | LOGICAL_DATABASES`.
- Logical-database-scoped accounts must select Logical Databases belonging to the same Instance.
- Database Detail exposes both account scope and selected Logical Database names.

### Credential permissions and audit — PASS (code/static/unit)
- Reveal/Copy remain ADMIN/EDITOR only.
- Viewer UI hides Reveal/Copy controls.
- Reveal writes `VIEW_PASSWORD` audit evidence.
- Copy writes `COPY_PASSWORD` audit evidence.

### Archive/restore and preservation — PASS (code/static/unit)
- Database Instance uses archive-first lifecycle and Administrator restore.
- Logical Database hard delete was removed from both the explicit route and name-sync path.
- Logical Database archive/restore changes status only; component and account-scope relationships remain connected.
- Archived Logical Databases remain visible in Database Detail but are excluded from new Application topology choices.
- Database Form represents only active Logical Database names so a normal Edit/Save cannot accidentally restore an archived Logical Database.

### List/search/filter/scale contract — PASS (code/static/unit)
- `/databases` is server-paginated and accepts `page`, `limit`, `q`, `environment`, `includeArchived`, `sortBy`, and `sortDir`.
- Page size is bounded to 200 and records beyond the former hard cap of 1,000 remain addressable.
- List uses an explicit lightweight projection; Documents, account rows, and deep topology stay detail-only.
- Server returns `total`, `totalPages`, and Environment counts.
- Frontend TanStack table uses manual pagination/sorting and server totals.
- Filter/search/sort changes reset pagination to page 1.

### Legacy `linkedApps` semantics — PASS (bounded compatibility)
- `linkedApps` is retained only as **Operational Client IP Metadata**.
- UI no longer presents this field as canonical Application topology.
- Canonical topology source is Logical Database ↔ Application Component.

## Evidence

Backend focused Database verification after 07a–07g:
- 5 suites pass.
- 18 tests pass.
- Backend build: TSC 0 issues; 116 files compiled.
- Prisma seed source formats/lints clean with deterministic Database acceptance fixtures.

Frontend verification:
- Database List/Detail/Form, KnowledgeDocumentLinks, Database CRUD E2E, and Database V1 acceptance spec pass ESLint + TypeScript compile gates.
- `e2e/database-v1-acceptance.spec.ts` passes Playwright `--list` and discovers:
  1. progressive `Needs Context` journey;
  2. Admin topology/account-scope/credential/archive-restore journey;
  3. Viewer read-only journey.

Deterministic fixtures prepared in `prisma/seed.ts`:
- `Treasury Registry DB` hosted by `vm-prod-01`.
- Logical Databases `registry` and `audit` linked to `Treasury Registry / PROD / Web+API`.
- `svc_registry` = instance-wide account.
- `report_reader` = Logical-Database-scoped account.
- `db-e2e-needs-context` = incomplete but valid progressive inventory record.

## Runtime / environment gates still pending

1. Run the real Prisma migration chain against the intended clean test database, including:
   - Database identity/account-scope migration;
   - Logical Database lifecycle migration.
2. Reseed deterministic fixtures with the configured credential encryption key.
3. Start backend/frontend normally outside the Serena request channel.
4. Run `database-v1-acceptance.spec.ts` in Chromium.
5. Verify audit rows, archive/restore persistence, and Application navigation after service restart.
6. Re-run full integration suite before Ticket 07 is marked DONE.

## Remediation slices

- 07a — Database Identity + Host Contract
- 07b — Database Account Secret + Scope Contract
- 07c — Logical DB ↔ Application Navigation
- 07d — Database Archive / RBAC / Persistence
- 07e — Legacy linkedApps + Lightweight List Contract
- 07f — Server-side Database List
- 07g — Database Environment Semantics
