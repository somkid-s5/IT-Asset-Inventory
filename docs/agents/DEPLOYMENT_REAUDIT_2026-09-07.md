# V1 Ticket 12 Deployment Re-Audit — 2026-09-07

## Decision

**CODE/CONFIG COMPLETE FOR THE AUDITED DEPLOYMENT SCOPE; LIVE HTTPS + RESTART ACCEPTANCE PENDING.**

Ticket 12 must not be marked fully done until a production-equivalent stack is started on a deployment VM, the internal CA is trusted by an acceptance client, the first Administrator is bootstrapped, and restart persistence is proved.

## Accepted implementation

### Production Compose boundary
- Active production services are exactly `postgres`, `backend`, `frontend`, and `gateway`.
- PostgreSQL uses a named volume and publishes no host/LAN port.
- Development seed/default-account passwords are absent from the Backend production environment.
- vCenter mock mode is forced off.
- Browser API traffic uses same-origin `/api`.
- PostgreSQL, Backend, Frontend, and Gateway all have healthchecks.
- Startup dependencies use `service_healthy` for required dependencies.
- Backend runs `prisma migrate deploy` before application startup.

### HTTPS edge
- Caddy publishes ports 80/443.
- `tls internal` issues the certificate for `APP_HOST`.
- HTTP redirects to HTTPS.
- Caddy config validates in the official Caddy container.
- Caddy CA/certificate state is persisted in `caddy_data`.
- Runbook permits distribution of `root.crt` only and explicitly forbids copying the CA private key `root.key`.

### Authentication/bootstrap
- Production has no default accounts and no self-registration.
- The first Administrator is created through the one-time bootstrap API authorized by `BOOTSTRAP_SECRET`.
- Secure authentication cookies are configured for production.

### Health/readiness
- `/api/health/live` reports process liveness.
- `/api/health/ready` performs a PostgreSQL readiness check and can return HTTP 503 independently of liveness.

## Static/build evidence

- `pwsh -File scripts/verify-production-compose.ps1 -EnvFile deploy/.env.production.example` — PASS.
- `docker compose ... config --quiet` — PASS.
- Production Compose service set — `backend`, `frontend`, `gateway`, `postgres` only.
- PostgreSQL published host ports — none.
- Backend production image build — PASS.
- Frontend production image build — PASS.
- `caddy validate --config /etc/caddy/Caddyfile` in `caddy:2-alpine` — PASS.
- Backend health/auth focused tests — 20/20 PASS across 2 suites.
- Backend build — TSC 0 issues; 124 files compiled at this gate.

## Environment observations

An already-running older development Compose project still contains an orphan `infrapilot_pgadmin` container. It is not part of the new production Compose contract. The production runbook uses `--remove-orphans` during `up -d --build` so a deployment upgrade removes obsolete project containers without deleting named volumes.

## Runtime gates still pending

1. Start the new four-service production-equivalent Compose stack.
2. Confirm `docker compose ps` reports all four services healthy.
3. Apply migrations to a fresh production-equivalent database.
4. Bootstrap exactly one Administrator and prove a second bootstrap is rejected.
5. Trust the generated Caddy `root.crt` on an acceptance client.
6. Prove HTTPS without `-k`, HTTP redirect, Secure cookie, and no mixed-content warnings.
7. Create V1 data, restart/recreate containers without `-v`, and prove users/Inventory/relationships/Documents/archive state/credentials persist.

Those runtime checks belong to Ticket 13 release integration evidence and cannot be replaced by prose or static configuration checks.
