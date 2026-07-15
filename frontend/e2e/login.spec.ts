import { test, expect } from '@playwright/test';

// Reset storageState to test logged-out / clean login states
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Username')).toBeVisible({ timeout: 10000 });
  });

  test('should display validation errors for empty fields', async ({ page }) => {
    // Click submit without entering values
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Check validation message using semantic role and filter
    await expect(page.getByRole('alert').filter({ hasText: 'Username is required' })).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'Password is required' })).toBeVisible();
  });

  test('should display error message on invalid credentials', async ({ page }) => {
    await page.getByLabel('Username').fill('wrong_user');
    await page.getByLabel('Password').fill('wrong_password');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for the toast notification
    await expect(
      page.getByText('Invalid username or password.')
        .or(page.getByText('Too many attempts. Please try again later.'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('should check password field is obscured', async ({ page }) => {
    const passwordInput = page.getByLabel('Password');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should disable submit button while request in-flight', async ({ page }) => {
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill('AssetOpsNewPass2026!!');

    let resolveGate: () => void = () => {};
    const gatePromise = new Promise<void>((resolve) => {
      resolveGate = resolve;
    });

    await page.route('**/api/auth/login', async (route) => {
      await gatePromise;
      await route.continue();
    });

    const loginRequestPromise = page.waitForRequest('**/api/auth/login');

    await page.getByRole('button', { name: 'Sign In' }).click();

    await loginRequestPromise;

    const loadingBtn = page.getByRole('button', { name: 'Signing in...' });
    await expect(loadingBtn).toBeDisabled();

    resolveGate();

    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should submit form on pressing Enter on password field', async ({ page }) => {
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill('AssetOpsNewPass2026!!');
    await page.getByLabel('Password').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should handle SQL injection attempts gracefully', async ({ page }) => {
    await page.getByLabel('Username').fill("' OR '1'='1");
    await page.getByLabel('Password').fill('anything');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(
      page.getByText('Invalid username or password.')
        .or(page.getByText('Too many attempts. Please try again later.'))
    ).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/.*login/);
  });

  test('should handle very long passwords gracefully', async ({ page }) => {
    const longPassword = 'a'.repeat(500);
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill(longPassword);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(
      page.getByText('Invalid username or password.')
        .or(page.getByText('Too many attempts. Please try again later.'))
    ).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/.*login/);
  });
});
