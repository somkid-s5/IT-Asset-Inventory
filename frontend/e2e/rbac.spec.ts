import { test, expect } from '@playwright/test';

test.describe('Role-Based Access Control Spec - Editor Access', () => {
  test.use({ storageState: 'playwright/.auth/editor.json' });

  test('Editor should access assets with write permissions', async ({ page }) => {
    await page.goto('/dashboard/assets');
    await expect(page.getByRole('button', { name: 'Add Asset' })).toBeVisible({ timeout: 10000 });
  });

  test('Editor cannot access user management', async ({ page }) => {
    await page.goto('/dashboard/users');
    // Exact redirect assertion to prevent false-positive matching of /dashboard/users
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test.describe('Role-Based Access Control Spec - Viewer Access', () => {
  test.use({ storageState: 'playwright/.auth/viewer.json' });

  test('Viewer should access assets in read-only mode', async ({ page }) => {
    await page.goto('/dashboard/assets');
    // Header check
    await expect(page.getByRole('heading', { name: 'Hardware & Infrastructure Inventory' })).toBeVisible({ timeout: 10000 });
    // Add Asset button must not be visible
    await expect(page.getByRole('button', { name: 'Add Asset' })).not.toBeVisible();
    // Import CSV button must not be visible
    await expect(page.getByRole('button', { name: 'Import' })).not.toBeVisible();
  });

  test('Viewer cannot access user management', async ({ page }) => {
    await page.goto('/dashboard/users');
    // Exact redirect assertion to prevent false-positive matching of /dashboard/users
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test.describe('Role-Based Access Control Spec - Unauthenticated Access', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('Direct URL without authentication redirects to login', async ({ page }) => {
    await page.goto('/dashboard/assets');
    await expect(page).toHaveURL(/\/login$/);
  });
});
