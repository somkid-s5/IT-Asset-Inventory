# ADR 0020: Use a Desktop-First Responsive Scope

- Status: Accepted
- Date: 2026-09-04

## Context

System Administration data entry and relationship management are primarily desktop tasks. The team may still need to look up infrastructure or credentials away from a full workstation.

## Decision

V1 uses the following responsive scope:

- Desktop and laptop provide the primary, complete authoring experience.
- Tablet supports the complete product workflow with responsive composition.
- Mobile prioritizes Global Search, list lookup, detail reading, and permission-gated credential reveal.
- Complex bulk actions and dense authoring forms are not required to be as efficient on Mobile as on Desktop.

## Consequences

- Responsive behavior remains consistent and usable without duplicating a separate mobile product.
- Browser acceptance emphasizes Desktop and Tablet authoring plus Mobile lookup journeys.
- Dense tables may become cards or focused row summaries on narrow screens using a shared responsive pattern.

