# 12c — Deployment Bootstrap, Health, and Persistence Contract

## Purpose
Define the production-equivalent acceptance sequence for first deployment and ordinary restarts.

## Contract
- Fresh schema creation uses committed Prisma production migrations via `prisma migrate deploy`.
- Production creates no default users and does not expose self-registration.
- The first Administrator is created exactly once through `POST /api/auth/bootstrap` with `x-bootstrap-key`.
- `/api/health/live` reports process liveness independently of PostgreSQL.
- `/api/health/ready` returns ready only when PostgreSQL is reachable and returns HTTP 503 when it is not.
- Ordinary `restart`, `down`, and `up -d` operations preserve PostgreSQL and Caddy named volumes.
- Acceptance must prove users, Inventory, relationships, Documents, archived state, and encrypted credentials survive restart.
- `docker compose down -v` is explicitly destructive and excluded from ordinary operations.

## Evidence
- Backend health/bootstrap implementation and tests.
- `docs/DEPLOYMENT_GUIDE.md`.
- `scripts/verify-production-compose.ps1`.

## Runtime gate still required
Run migrations against a fresh production-equivalent database, bootstrap the first Administrator, perform the V1 story, restart the stack, and verify persisted state.
