# E2E Testing Conventions

## Layout
- Specs: `frontend/e2e/**/*.spec.ts`
- Page objects: `none — flat specs`
- Shared fixtures: `none`
- Never touch: `none`

## Locator strategy (this app's reality)
- Buttons / links: `getByRole('button' | 'link', { name })`
- Form inputs: `getByLabel` (labels exist for username/password and input fields) or `getByPlaceholder` / `getByRole('textbox')` where appropriate.
- Last resort: `data-testid`. Raw CSS chains / XPath: forbidden.

## Assertions
Auto-waiting web-first assertions only (`toBeVisible`, `toHaveURL`, `toHaveText`, `toHaveCount`). No `waitForTimeout`, no one-shot boolean checks (`expect(await el.isVisible())`).

## Network
- API shape: Backend routes prefixed with `/api/*` (e.g. `/api/auth/login`, `/api/assets`).
- Writes/credentials: Using real backend with local postgres DB for full integration testing.

## Auth
- Session setup: UI login or custom session restoration via storageState.
- Logged-out scenarios: fresh context.

## Run
- All E2E: `npm run test:e2e` (inside `frontend/`)
- Single spec: `npx playwright test e2e/<name>.spec.ts` (inside `frontend/`)
- Dev server: must be running at `http://localhost:3000` first.

## Adding tests (AI agents start here)
To add E2E coverage for feature X: copy the shape of `e2e/login.spec.ts`, add locators only via the Locator Mapping Table workflow, then run `npm run test:e2e`.

## Product / Data / UX completeness gate

Before planning or implementing product-facing work, read `docs/agents/ORCHESTRATION_FLOW.md`.

For substantial feature, screen, table, schema, API, or workflow work, use the project-local skills when available:
- `.agents/skills/prd-plan/SKILL.md`
- `.agents/skills/product-design-and-ux/SKILL.md`
- `.agents/skills/production-app-completeness/SKILL.md`

Use them together with the installed AI Hero flow: `grill-with-docs` -> `to-spec` -> `to-tickets` -> `implement`/`tdd` -> `code-review`.

Hard rule: rendering is not completion. A feature is not done until its operational purpose, data model, relationships, states, permissions, API/persistence trace, realistic data behavior, downstream usage, and acceptance evidence are covered. Tickets should be vertical slices across schema/API/UI/tests where applicable.

Model policy: use GPT-5.6 Luna High for implementation workers and routine ticket execution. Auditor/reviewer roles (including Product/Data Audit, UX Audit, architecture/completeness review, and spec-vs-code review) may use GPT-5.6 Sol when deeper reasoning materially improves review quality. Do not silently upgrade ordinary implementation workers to Sol.
