# ADR 0022: Deploy as a Single-VM Docker Compose Stack

- Status: Accepted
- Date: 2026-09-04

## Context

The product is an internal tool for one System Administrator team. It does not require distributed orchestration or public hosting.

## Decision

V1 is deployed as one Docker Compose stack on a single internal VM:

- frontend;
- backend;
- PostgreSQL;
- any required reverse-proxy process defined by the final transport decision.

Users access the product by the VM's internal IP address. DNS is not required for V1. Kubernetes and external managed services are out of scope.

## Consequences

- Deployment, upgrade, backup, restore, and rollback procedures target one VM.
- PostgreSQL storage uses a persistent volume and is not exposed beyond what administration requires.
- Health checks and restart persistence must be verified on the real Compose stack.
- URLs and cookie configuration must work correctly with IP-based access.

