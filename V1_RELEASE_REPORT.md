# IT Asset Inventory V1 Release Report

Date: 2026-09-07
Branch: `codex/inventory-registry-hardening`
HEAD at acceptance: `d25023c`
Release verdict: **PASS**

## Scope

This report covers the V1 implementation and runtime acceptance for the IT Asset Inventory project, including Assets, Applications, Virtual Machines, Databases, Knowledge Base/Documents, Global Search, Data Quality, RBAC, sensitive export, production Docker Compose, HTTPS-by-IP, secure authentication cookies, and restart/recreate persistence.

The acceptance environment used the isolated Compose project `infrapilot-v1-acceptance` and base URL `https://10.10.10.204`. The primary/non-acceptance database was not used for destructive acceptance work.

## Final blocker fixes closed in this wave

- Added Caddy `default_sni {$APP_HOST}` so direct `https://<internal-ip>` clients that omit IP SNI still receive the internal-IP certificate.
- Added/verified persistent `backend_uploads:/app/uploads` storage so KB images and Asset attachments survive Backend recreation.
- Fixed Asset list URL-sync/navigation races and stale list cache after edit/detail navigation.
- Fixed deterministic Asset credential-to-access-point seed linkage.
- Fixed Data Quality semantic headings and V1 contract assertions.
- Fixed public Knowledge Base direct-link behavior so `/docs/:id` does not perform workspace `/auth/me` verification and redirect anonymous readers to `/login`.
- Added migration `20260907031500_allow_progressive_vm_context` so `VmInventory.environment` is nullable in PostgreSQL, matching `schema.prisma` and Ticket 06f progressive-promotion semantics.
- Aligned `prisma db seed` with the tested seed compiler configuration via `prisma/tsconfig.seed.json`.
- Updated stale Playwright locators/contracts to match the accepted V1 UI/API behavior without weakening security or persistence assertions.

## Backend gates

- Jest: **36/36 test suites PASS**
- Jest: **125/125 tests PASS**
- Backend production build: **PASS**
- TypeScript checker: **0 issues**
- SWC compile: **124 files compiled**
- Prisma schema validation: **PASS**
- `git diff --check`: **PASS**

## Frontend gates

- ESLint: **PASS**
- TypeScript `tsc --noEmit`: **PASS**
- Next.js production build: **PASS**
- Production routes generated successfully, including `/docs/[id]` and all V1 dashboard routes.

## Playwright V1 acceptance

Current test discovery:

- **82 tests**
- **31 files**

All unique tests were executed on the freshly migrated/seeded isolated acceptance database with `workers=1` and `retries=0`. Because the workstation connector cannot reliably hold one long-running Playwright invocation without returning a 502, the suite was executed in serial groups while preserving the same production HTTPS runtime.

Fresh-state groups completed successfully:

- Asset CRUD/detail/list/import-export/V1 acceptance: **24/24 PASS** for that invocation.
- Dashboard/Data Quality/Database V1 + CRUD/detail/list: **17/17 PASS**.
- Docs/KB/Public Link/Global Search: **15/15 PASS**.
- Admin/Auth/Profile/RBAC/Sensitive Export: **27/27 PASS**.
- VM detail/list/sources/V1 browser tests: **8/8 PASS** using the already-created auth storage state, matching normal full-suite dependency behavior.

The repeated setup projects in segmented invocations are duplicates; the unique discovered matrix remains 82 tests / 31 files.

## Fresh database and deterministic seed

Fresh PostgreSQL acceptance volume was created after `docker compose down -v` on the isolated acceptance project only.

- Prisma migrations found: **34**
- Prisma migrations applied from zero: **34/34 PASS**
- Latest migration applied: `20260907031500_allow_progressive_vm_context`
- Deterministic development acceptance seed: **PASS**

Seed stages passed:

1. Users
2. Sample category
3. Assets
4. Application topology
5. Virtual Machine + Application relationships
6. Database topology
7. Knowledge Base document + canonical inventory links
8. Credentials + explicit access-point credential link

## HTTPS-by-IP and authentication evidence

After production stack start and again after force-recreate:

- `GET https://10.10.10.204/api/health/live` -> **200**
- `GET https://10.10.10.204/api/health/ready` -> **200**
- `http://10.10.10.204/` -> permanent redirect -> **PASS**
- Redirect target is `https://10.10.10.204/` -> **PASS**
- Chromium/Playwright HTTPS-by-IP -> **PASS**

Authentication cookie captured from the HTTPS Playwright login state:

- Cookie present: **PASS**
- `Secure`: **true**
- `HttpOnly`: **true**
- `SameSite`: **Lax**
- Cookie domain: `10.10.10.204`

## Container recreation persistence

Persistence baseline before force-recreate:

`3|1|10|3|4|1|4|1|4|4|3`

Fields represented in order:

`Users | Applications | Assets | VM Inventory | Database Inventory | Knowledge Documents | encrypted Asset Credentials | encrypted VM Guest Accounts | encrypted Database Accounts | Application-Asset relationships | Application-VM relationships`

After `docker compose up -d --force-recreate --wait postgres backend frontend gateway`:

- Persistence digest after: `3|1|10|3|4|1|4|1|4|4|3`
- Digest exact match: **PASS**
- Upload files before: **2**
- Upload files after: **2**
- `/app/uploads/acceptance/persistence-marker.txt` survived: **PASS**
- All four services returned healthy after recreation: **PASS**

## Security and boundary checks covered

- Viewer credential reveal restriction: **PASS**
- Credential copy audit (`COPY_PASSWORD`): **PASS**
- Viewer V1 read-only restrictions for Assets/VMs/Databases/Documents: **PASS**
- Admin-only user management: **PASS**
- Unauthenticated dashboard redirect: **PASS**
- Public known-document link exposes only the safe public representation: **PASS**
- Anonymous KB enumeration endpoints remain protected: **PASS**
- Sensitive encrypted workbook export is Admin-only and browser-validated: **PASS**
- HTTP-to-HTTPS redirect and secure cookie flags: **PASS**

## Non-blocking warnings observed

- Backend Jest emitted a Node experimental warning about localStorage configuration; tests remained fully green.
- Next.js build emitted a Node deprecation warning for `module.register()`; build remained fully green.
- Git emitted CRLF/LF conversion warnings for several working-tree files; `git diff --check` passed.

These are warnings only and are not V1 release blockers.

## Repository state

The V1 implementation is present as a large uncommitted working-tree change on `codex/inventory-registry-hardening`. No commit, merge, push, or destructive reset was performed as part of this acceptance run.

Release verdict refers to the tested working-tree implementation recorded above.

## Final verdict

**V1 RELEASE ACCEPTANCE: PASS**

The feature/runtime architecture blockers are closed. Fresh migrations, deterministic seed, browser acceptance, production HTTPS-by-IP, secure cookies, database relationships/credentials, uploads persistence, container force-recreation, lint/type/build, backend tests, and schema validation all passed.
