# 12a — Production Compose Runtime Contract

## Purpose
Keep the V1 production runtime bounded, repeatable, and free of development-only services or credentials.

## Contract
- Production services are exactly PostgreSQL, Backend, Frontend, and Caddy gateway.
- PostgreSQL has a named persistent volume and no published host/LAN port.
- Backend receives production secrets only; development seed passwords and vCenter mock mode are absent/disabled.
- Backend waits for healthy PostgreSQL and runs `prisma migrate deploy` before application startup.
- Frontend waits for healthy Backend and uses same-origin `/api`.
- Gateway waits for healthy Backend and Frontend.
- Every runtime service has a healthcheck.
- Obsolete Compose services such as pgAdmin are removed from the active production contract.

## Evidence
- `scripts/verify-production-compose.ps1`
- `docker compose --env-file deploy/.env.production.example config --quiet`
- production Backend/Frontend image build

## Runtime gate still required
A deployment VM must run the stack and prove restart persistence without deleting named volumes.
