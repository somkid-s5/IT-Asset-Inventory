# ADR 0003: Model Application Environments as Components

- Status: Accepted
- Date: 2026-09-04

## Context

An Application environment can use several machines and databases with different operational responsibilities. A flat list of related records shows where a system exists but does not explain what each record does.

## Decision

Each Application Environment may contain Components. A Component names an operational role within that environment, for example:

- Load Balancer
- Web
- Application
- Database
- Batch

A Component may relate to one or more VMs, physical Assets, or Databases. Component names are team-managed rather than restricted to a fixed global list.

## Consequences

- The Application Environment view can present an understandable topology instead of an unstructured list.
- Multiple infrastructure records may serve the same role for redundancy or scale.
- The product must not require a separate Component when a simple environment genuinely has only one role; a concise default component can be used.

