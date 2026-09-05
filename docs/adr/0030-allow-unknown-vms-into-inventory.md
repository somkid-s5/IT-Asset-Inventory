# ADR 0030: Allow Unknown VMs into Inventory

- Status: Accepted
- Date: 2026-09-04

## Context

The team may discover a VM in vCenter without yet knowing which system or project it belongs to. Requiring Application context before promotion would leave real infrastructure outside Inventory or encourage guessed data.

## Decision

A discovered VM can be promoted into Inventory without an Application or Component relationship.

- The VM receives a `Needs Context` data-quality state.
- Application, Component, and other business context remain optional until known.
- The VM appears in Data Quality for later curation.
- The system does not infer or create an Application automatically.
- The VM becomes `Complete` when the accepted minimum context is supplied.

## Consequences

- Inventory can reflect all discovered VMs immediately.
- Unknown ownership is represented explicitly rather than hidden or guessed.
- Promotion and data-quality state are separate concerns and require distinct acceptance tests.

