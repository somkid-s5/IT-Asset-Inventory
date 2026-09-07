# Deploy InfraPilot V1 on an Internal IP with HTTPS

This runbook deploys the accepted V1 stack on one internal VM using Docker Compose. The production runtime is intentionally limited to PostgreSQL, Backend, Frontend, and Caddy. Application-managed backup/restore, DNS, Kubernetes, pgAdmin, and NetBackup configuration are outside this workflow.

## 1. Prerequisites

Prepare a deployment VM with:

- Docker Engine and Docker Compose v2;
- a stable internal IP or internal DNS name;
- TCP 80 and 443 reachable from approved client machines;
- the repository checked out locally;
- a production `.env` that is never committed.

The production Compose stack does not publish PostgreSQL to the LAN.

## 2. Create the production environment file

From the repository root:

```bash
cp deploy/.env.production.example .env
```

Replace every placeholder. Required values are:

```dotenv
POSTGRES_USER=infrapilot
POSTGRES_PASSWORD=<long-random-password>
POSTGRES_DB=infrapilot_db
JWT_SECRET=<long-random-secret>
CREDENTIAL_ENCRYPTION_KEY=<exactly-64-hex-characters>
BOOTSTRAP_SECRET=<long-random-one-time-bootstrap-secret>
APP_HOST=192.168.1.50
FRONTEND_URL=https://192.168.1.50
NEXT_PUBLIC_API_URL=/api
VCENTER_ALLOWED_HOSTS=vcenter.example.internal
```

Production does **not** use `DEFAULT_ADMIN_PASSWORD`, `DEFAULT_EDITOR_PASSWORD`, `DEFAULT_VIEWER_PASSWORD`, development seed accounts, or vCenter mock mode.

`APP_HOST` must be the exact IP address or internal DNS name users will open. `NEXT_PUBLIC_API_URL=/api` keeps browser API, downloads, and image requests on the same HTTPS origin.

Before deployment, run the static production check:

```powershell
pwsh -File scripts/verify-production-compose.ps1 -EnvFile .env
```

## 3. Build and start the stack

From the repository root:

```bash
docker compose --env-file .env up -d --build --remove-orphans
```

Startup is bounded by health dependencies:

1. PostgreSQL becomes healthy.
2. Backend runs `prisma migrate deploy`, starts, and becomes database-ready.
3. Frontend starts and becomes healthy.
4. Caddy starts after Backend and Frontend are healthy.

Check status:

```bash
docker compose --env-file .env ps
```

Expected runtime services are exactly:

- `postgres`
- `backend`
- `frontend`
- `gateway`

## 4. Liveness and readiness

These endpoints intentionally answer different questions:

```bash
curl -k https://192.168.1.50/api/health/live
curl -k https://192.168.1.50/api/health/ready
```

- `/api/health/live` means the Backend process is alive.
- `/api/health/ready` means required dependencies, currently PostgreSQL, are ready.

A database outage can therefore make readiness return HTTP 503 while liveness still reports the process as alive.

## 5. Bootstrap the first Administrator exactly once

There is no production default account and no self-registration flow. The first Administrator is created through the bootstrap API.

Before the Caddy root CA is trusted, use `-k` only for this controlled setup request:

```bash
curl -k -X POST "https://192.168.1.50/api/auth/bootstrap" \
  -H "Content-Type: application/json" \
  -H "x-bootstrap-key: <BOOTSTRAP_SECRET>" \
  -d '{
    "username": "admin",
    "displayName": "Infrastructure Administrator",
    "password": "<strong-initial-password>"
  }'
```

After the first user exists, the same bootstrap endpoint rejects another bootstrap attempt. Normal user creation is then Administrator-managed through the Users workflow.

Do not put `BOOTSTRAP_SECRET`, user passwords, JWT material, or the credential-encryption key in tickets, screenshots, shell history shared with others, or committed files.

## 6. Trust the Caddy internal CA

Caddy uses `tls internal`. Its CA state is persisted in the `caddy_data` volume and server certificates are renewed automatically while that volume is preserved.

Copy **only the public root certificate** from the running gateway:

```bash
docker compose --env-file .env cp gateway:/data/caddy/pki/authorities/local/root.crt ./deploy/infrapilot-caddy-root.crt
```

Never copy, distribute, or commit:

```text
/data/caddy/pki/authorities/local/root.key
```

That file is the CA private key.

### Windows client trust

Run an elevated Command Prompt or PowerShell on each managed client:

```powershell
certutil -addstore -f Root .\infrapilot-caddy-root.crt
```

For centrally managed Windows endpoints, distribute the public root certificate through the organization's normal certificate-management mechanism instead of installing it manually on every machine.

### Debian/Ubuntu client trust

```bash
sudo cp infrapilot-caddy-root.crt /usr/local/share/ca-certificates/infrapilot-caddy-root.crt
sudo update-ca-certificates
```

### RHEL-compatible client trust

```bash
sudo cp infrapilot-caddy-root.crt /etc/pki/ca-trust/source/anchors/infrapilot-caddy-root.crt
sudo update-ca-trust
```

After trust is installed, reopen the browser and use only:

```text
https://<APP_HOST>
```

Do not delete `caddy_data` during normal upgrades. Deleting that volume creates a new internal CA and requires redistributing a new root certificate.

## 7. Verify HTTP redirects to HTTPS

```bash
curl -I http://192.168.1.50
```

Expected result is a permanent redirect, normally HTTP 301 or 308, to the same host over HTTPS.

After the root CA is trusted, verify without `-k`:

```bash
curl https://192.168.1.50/api/health/ready
```

## 8. Verify Secure authentication cookies and same-origin content

Log in through `https://<APP_HOST>`, then inspect the `access_token` cookie in browser developer tools. It must be:

- `HttpOnly`
- `Secure`
- `SameSite=Lax`
- scoped to `/`

The production frontend uses `/api`, so API calls, Sensitive Inventory downloads, and Knowledge Base images remain on the same HTTPS origin. Treat any browser mixed-content warning as a release blocker.

## 9. Restart and persistence acceptance

Normal restart operations preserve PostgreSQL, uploaded Asset/Knowledge Base files, and Caddy state through named volumes:

```bash
docker compose --env-file .env restart
```

A full container recreation without volume deletion must also preserve state:

```bash
docker compose --env-file .env down
docker compose --env-file .env up -d
```

After restart, verify that previously created users, Inventory records, relationships, Documents, archived states, and encrypted credentials still work.

**Never use this in production unless intentional data destruction is approved:**

```bash
docker compose down -v
```

`-v` deletes the PostgreSQL, Backend uploads, and Caddy named volumes.

## 10. Upgrade workflow

For an application update:

```bash
git pull --ff-only
pwsh -File scripts/verify-production-compose.ps1 -EnvFile .env
docker compose --env-file .env up -d --build --remove-orphans
```

Backend startup applies committed production migrations with `prisma migrate deploy`. Do not use `prisma db push` on the production stack.

## 11. Operational checks

Useful commands:

```bash
docker compose --env-file .env ps
docker compose --env-file .env logs --tail=200 backend
docker compose --env-file .env logs --tail=200 frontend
docker compose --env-file .env logs --tail=200 gateway
```

The release acceptance sequence must also verify Login, Application topology, Assets, VM lifecycle, Databases, Documents, Global Search, Data Quality, archive/restore, role restrictions, Audit Logs, and the encrypted Sensitive Inventory Export.

## 12. What this runbook intentionally does not provide

V1 does not add:

- application-managed database backup or restore;
- NetBackup configuration;
- DNS automation;
- Kubernetes deployment;
- public Internet exposure;
- production pgAdmin;
- production seed users.

Protect the deployment VM and its Docker volumes using the infrastructure team's approved backup process outside this application.
