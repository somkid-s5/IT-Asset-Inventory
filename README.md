# SysOps — IT Inventory Registry

SysOps is an internal IT inventory registry for hardware assets, virtual machines, databases, credentials, and technical documentation. The product is intentionally focused on trustworthy inventory data; ticketing and SLA management are not included.

## Features

- Asset, VM, and database inventory with controlled access
- vCenter source management and VM discovery
- Knowledge Base for internal technical documentation
- Dashboard summary for records that need review
- Asset CSV export and bulk Asset owner/status updates
- Audit logging, encrypted credentials, JWT authentication, and role-based access control

## Stack

- Frontend: Next.js, React, Tailwind CSS, TanStack Query/Table
- Backend: NestJS, Prisma, PostgreSQL
- Infrastructure: Docker Compose and VMware vCenter integration

## Local development

### Prerequisites

- Node.js 20 LTS
- Docker Desktop with Docker Compose

Confirm `node --version` reports `v20.x` before running project npm or Prisma commands.

### Configuration

Generate an ignored root `.env` with local-only random secrets. The script does not print secret values.

```powershell
node scripts/setup.js
```

Install dependencies from the lockfiles in both applications.

```powershell
Set-Location backend
npm ci
Set-Location ..\frontend
npm ci
Set-Location ..
```

Important settings include `DATABASE_URL`, `JWT_SECRET`, `CREDENTIAL_ENCRYPTION_KEY`, `REGISTRATION_SECRET`, `FRONTEND_URL`, and the three `DEFAULT_*_PASSWORD` values. Keep the generated `.env` local and never commit it.

vCenter sync uses real HTTPS connections by default. The built-in sample adapter is development-only and opt-in: set `VCENTER_MOCK_ENABLED=true` only when intentionally testing against a known mock hostname such as `infrapilot.local`. It is rejected in production; leave it `false` or unset for real vCenter connections.

### Start the development stack

Run PostgreSQL 15 in Docker while keeping the backend and frontend native for fast development feedback.

```powershell
docker compose --env-file .env -f docker-compose.db.yml up -d

Set-Location backend
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

In a second terminal:

```powershell
Set-Location frontend
npm run dev
```

The seed command is development-only, requires `ALLOW_DEVELOPMENT_SEED=true`, preserves existing records, and upserts repeatable fixtures. It refuses to run with `NODE_ENV=production`.

Open `http://localhost:3000`; the API is available at `http://localhost:3001/api` and PostgreSQL is bound to `127.0.0.1:5435`. Use `/api/health/live` for process liveness and `/api/health/ready` for PostgreSQL readiness; readiness returns HTTP 503 when the database is unavailable.

### Stop without deleting data

Stop the two native development processes with `Ctrl+C`, then stop only the database container:

```powershell
docker compose --env-file .env -f docker-compose.db.yml stop
```

Do not use `docker compose down -v`; the `postgres_test_data` named volume contains the local database.

## Verification

```powershell
Set-Location backend
npm run build
npm run lint
npm test -- --runInBand
npm run test:e2e

Set-Location ..\frontend
npm run lint
npm run build
npm run test:e2e
```

For release checks, backup procedures, migration notes, and post-deployment verification, see [production-readiness.md](docs/production-readiness.md).
