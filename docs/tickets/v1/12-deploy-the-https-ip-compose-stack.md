## Parent

#4 — Spec: V1 internal infrastructure inventory

## What to build

Deliver a repeatable production deployment on one internal VM where the complete Compose stack starts automatically, is reached only through HTTPS at its internal IP, and preserves application state across ordinary restarts.

## Acceptance criteria

- [ ] One documented Compose workflow starts frontend, backend, PostgreSQL, and the TLS edge with health checks and bounded startup dependencies.
- [ ] A fresh deployment creates the schema through production migrations and provides the one-time Administrator bootstrap flow.
- [ ] The application is reached through `https://<internal-ip>` using an internal or self-signed certificate; HTTP redirects to HTTPS.
- [ ] Authentication cookies are Secure and frontend, API, downloads, and images contain no mixed HTTP content.
- [ ] Certificate creation, placement, renewal, and browser acceptance are documented without committing private key material.
- [ ] PostgreSQL is persisted and not unnecessarily exposed to the LAN.
- [ ] Restarting containers and rebooting the Deployment VM restores a healthy stack without deleting created users or records.
- [ ] Liveness and readiness endpoints distinguish process availability from database readiness.
- [ ] Application-managed Backup, Restore, NetBackup configuration, DNS, and Kubernetes are absent from this ticket.

## Blocked by

- #5 — V1-01: Establish a green implementation baseline.
- #7 — V1-03: Complete authentication, users, and audit journeys.
