# ADR 0005: Use Application as the Single System Concept

- Status: Accepted
- Date: 2026-09-04

## Context

Using both Application and Service as separate records would introduce overlapping terminology and additional screens without a demonstrated operational need. Technical roles inside a system are already represented by Components.

## Decision

Application is the only first-class concept for a system operated or supported by the team.

Web, API, Batch, Database, and similar deployable or operational roles are Components within an Application Environment. Service is not a separate entity in V1.

## Consequences

- Navigation, search, forms, and documentation consistently use Application.
- No Service CRUD module or Service-to-Application hierarchy will be built for V1.
- A future Service concept requires a new decision supported by a distinct user need.

