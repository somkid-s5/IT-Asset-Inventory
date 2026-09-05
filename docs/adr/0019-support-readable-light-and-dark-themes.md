# ADR 0019: Support Readable Light and Dark Themes

- Status: Accepted
- Date: 2026-09-04

## Context

The internal inventory must remain comfortable to read during routine, extended use. A decorative cyber theme or page-specific effects would conflict with consistency and readability.

## Decision

V1 supports Light and Dark themes through one shared set of semantic design tokens.

- Light is the default.
- The user's explicit preference is remembered.
- Both themes use the same component hierarchy, spacing, typography, and interaction behavior.
- Text and interactive-state contrast must remain accessible in both themes.
- Cyber styling, glass effects, and theme-specific decorative composition are not part of the design system.

## Consequences

- Shared templates and components are visually verified in both themes.
- Pages do not introduce raw colors or theme-specific one-off overrides.
- Readability and clear status communication take priority over visual effects.

