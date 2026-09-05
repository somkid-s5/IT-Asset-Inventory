## Parent

#4 — Spec: V1 internal infrastructure inventory

## What to build

Deliver a complete production account lifecycle under the shared UI system: one-time Administrator bootstrap, Login and profile handling, Administrator-managed users, consistent role enforcement, and secret-safe Audit Logs.

## Acceptance criteria

- [ ] A fresh production stack provides an explicit one-time first-Administrator bootstrap without creating a default account.
- [ ] After bootstrap, self-registration is unavailable and only an Administrator can create or manage users.
- [ ] A new user's initial-password and forced-change journey completes through the UI.
- [ ] Viewer, Editor, and Administrator permissions match ADR 0013 in both API responses and visible actions.
- [ ] Only Administrators can access Audit Logs.
- [ ] Login, failed Login, user management, and protected actions generate actor, action, target, and timestamp audit entries.
- [ ] Passwords, tokens, encryption keys, and other secret values are absent from responses, errors, application logs, and Audit Logs.
- [ ] Login, Users, Profile, and Audit pages use the shared templates and contain no superseded page-specific visual system.
- [ ] Role-specific browser journeys prove access granted and denied through both UI and direct API requests.

## Blocked by

- #5 — V1-01: Establish a green implementation baseline.
- #6 — V1-02: Rebuild the shared UI system and Dashboard summary.
