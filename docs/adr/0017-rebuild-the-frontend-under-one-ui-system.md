# ADR 0017: Rebuild the Frontend Under One UI System

- Status: Accepted
- Date: 2026-09-04

## Context

The product has been adjusted repeatedly and now contains page-specific composition and styling that make it difficult to reach a stable, consistent result. The backend, data model, authentication, and several frontend foundations remain valuable. Patching each legacy page independently would continue the inconsistency.

## Decision

V1 uses a Controlled UI Rebuild of the frontend presentation and navigation layers.

The rebuild will:

- preserve backend contracts and business behavior unless another accepted decision requires a change;
- reuse the established shadcn primitives, Tailwind design tokens, and sound frontend utilities;
- make Application the primary information-architecture concept;
- freeze shared Dashboard, List, Detail, and Dialog templates before page migration;
- use the same spacing, typography, states, actions, responsive behavior, and interaction conventions across modules;
- remove superseded legacy page composition and styling as each route is migrated;
- allow a documented template exception only when the content genuinely requires it, such as Application topology or the Document editor.

The rebuild is not a backend rewrite and is not permission to add unrelated features or visual experiments.

## Consequences

- Pages are migrated and verified as bounded end-to-end vertical slices.
- A migrated route is not complete while its superseded legacy presentation remains active.
- Browser verification covers desktop and mobile layouts, keyboard access, empty/loading/error states, and the real user journey.
- Visual consistency is evaluated against the shared templates and tokens, not subjective per-page preference.

