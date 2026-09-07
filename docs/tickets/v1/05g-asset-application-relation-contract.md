## Parent
Ticket 05 — Connect Hardware Assets to Application topology

## Goal
Make Asset ↔ Application Component relationships operationally meaningful instead of storing every link as the schema default `PRIMARY`.

## Problem
`ApplicationComponentAsset` stores `relationType` and `responsibleParty`, but current Asset/Application write paths accept only arrays of IDs. Every newly created link therefore silently becomes `PRIMARY`, so the product cannot represent one primary relationship plus additional shared relationships as required by V1.

## Required behavior
- Asset create/edit can designate at most one Primary Application Component relationship.
- Additional relationships are explicitly stored as `SHARED`.
- Existing relation metadata is preserved on edit rather than reconstructed from IDs only.
- Backend rejects duplicate component links, more than one PRIMARY relationship, and unknown component IDs.
- Asset detail exposes related Application, Environment, Component, relation type, and optional relationship responsible party using an explicit projection.
- Primary relationship is visually prominent; shared relationships remain visible and navigable to the Application detail.
- Keep legacy `componentIds` input only as a compatibility path during this slice; new UI must use structured `componentLinks`.

## Acceptance evidence
- Focused backend tests cover one PRIMARY + multiple SHARED, duplicate rejection, multi-primary rejection, unknown component rejection, and edit persistence.
- Frontend lint/typecheck green.
- Browser journey creates/edits primary + shared links and verifies Asset detail/Application navigation when runtime is available.

## Out of scope
- VM relation metadata redesign.
- General graph/topology visualization.
- Per-port/network dependency relationships.
