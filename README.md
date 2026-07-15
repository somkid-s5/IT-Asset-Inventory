# SysOps — IT Inventory Registry

SysOps is an internal IT inventory registry for hardware assets, virtual machines, databases, credentials, and technical documentation. The product is intentionally focused on trustworthy inventory data; ticketing and SLA management are not included.

## Features

- Asset, VM, and database inventory with controlled access
- vCenter source management and VM discovery
- Knowledge Base for internal technical documentation
- Data Quality Queue for incomplete Asset, Database, and VM records
- CSV asset import/export, saved Asset views, and bulk Asset owner/status updates
- Audit logging, encrypted credentials, JWT authentication, and role-based access control

## Stack

- Frontend: Next.js, React, Tailwind CSS, TanStack Query/Table
- Backend: NestJS, Prisma, PostgreSQL
- Infrastructure: Docker Compose and VMware vCenter integration

## Local development

### Prerequisites

- Node.js 20+
- Docker Desktop with Docker Compose

### Configuration

Copy the root environment template and replace every placeholder with a development-safe value.

```bash
cp .env.example .env
```

Important settings include `JWT_SECRET`, `CREDENTIAL_ENCRYPTION_KEY`, `REGISTRATION_SECRET`, `FRONTEND_URL`, and `VCENTER_ALLOWED_HOSTS`.

### Run the stack

```bash
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy
```

Open `http://localhost:3000`.

## Verification

```bash
cd backend
npm run build
npm test -- --runInBand

cd ../frontend
npm run lint
npm run build
```

For release checks, backup procedures, migration notes, and post-deployment verification, see [production-readiness.md](docs/production-readiness.md).
