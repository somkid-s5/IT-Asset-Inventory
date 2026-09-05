# ADR 0007: Support Dedicated and Shared Infrastructure

- Status: Accepted
- Date: 2026-09-04

## Context

Most Applications are project-specific and use their own VMs, physical Assets, and Databases. Shared infrastructure is uncommon but may exist. A strictly one-to-one model would force duplicate records or free-text workarounds for those exceptions.

## Decision

The normal user journey presents one primary Application relationship for an infrastructure record. The relationship model supports an infrastructure record being used by more than one Application Component when a shared case exists.

## Consequences

- Dedicated project infrastructure remains quick to record and easy to read.
- Shared infrastructure can be represented without duplicating inventory records.
- Application views must make shared relationships visible without making the common single-Application form unnecessarily complex.

