# ADR 0023: Require HTTPS with an Internal Certificate

- Status: Accepted
- Date: 2026-09-04

## Context

The product is accessed by internal IP address and transmits permission-gated credentials. Internal network placement does not protect browser-to-server traffic from being read in transit. The team accepts a browser trust prompt for an internal or self-signed certificate.

## Decision

The production deployment is HTTPS-only at the Deployment VM's internal IP address using an internal or self-signed certificate.

- HTTP redirects to HTTPS.
- Authentication cookies use the Secure attribute.
- Frontend, API, downloads, and uploaded content are served without mixed HTTP content.
- Certificate creation, installation, renewal, and browser acceptance are documented in the deployment runbook.

Publicly trusted certificates and public internet exposure are not required for V1.

## Consequences

- Users may need to accept or trust the internal certificate on each client device.
- The Compose stack requires a TLS-terminating reverse proxy or equivalent edge process.
- Runtime verification uses the HTTPS IP endpoint and confirms authentication persistence.

