import { test, expect } from '@playwright/test';

test.describe('Admin Users Management', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/users');
    await expect(page.getByRole('heading', { name: 'System Access & User Directory' })).toBeVisible({ timeout: 10000 });
  });

  test('should display user role tabs and inline permissions', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Admins/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Editors/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Viewers/ })).toBeVisible();
  });

  test('should validate add user form', async ({ page }) => {
    await page.getByRole('button', { name: 'Add New User' }).click();

    // Fill in display name and username
    await page.getByLabel('Display Name').fill('Test User');
    await page.getByLabel('Username').fill('test_user_validate');
    // Use an invalid/weak password to trigger backend/frontend custom validation
    await page.getByLabel('Password').fill('short');

    await page.getByRole('button', { name: 'Create User' }).click();

    // Expect custom password policy validation toast error in container
    await expect(page.getByLabel('Notifications alt+T')).toContainText('Password must be at least 8 characters and include uppercase, lowercase, and a number');

    // Check that dialog remains open after failed validation
    await expect(page.getByRole('heading', { name: 'Add New User' })).toBeVisible();
  });
});
