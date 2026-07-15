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
