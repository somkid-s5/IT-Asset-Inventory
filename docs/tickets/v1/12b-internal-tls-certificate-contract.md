# 12b — Internal TLS and Certificate Contract

## Purpose
Make the accepted internal-IP HTTPS deployment reproducible without committing or distributing private key material.

## Contract
- Caddy is the only LAN edge and publishes TCP 80/443.
- `APP_HOST` is the internal IP or internal DNS name users open.
- Caddy uses `tls internal` and redirects HTTP to HTTPS.
- Caddy CA/server-certificate state persists in `caddy_data` and renews automatically while that volume is retained.
- Operators may distribute only `/data/caddy/pki/authorities/local/root.crt`.
- `/data/caddy/pki/authorities/local/root.key` must never be copied, committed, attached to tickets, or delivered to clients.
- Browser/API/download/image traffic stays same-origin HTTPS through `/api`.
- Authentication cookies are configured Secure in production.

## Evidence
- `deploy/Caddyfile`
- `docker compose ... caddy validate`
- `docs/DEPLOYMENT_GUIDE.md`

## Runtime gate still required
Trust the generated root certificate on an acceptance client and prove HTTPS without `-k`, HTTP redirect, and no browser mixed-content warnings.
