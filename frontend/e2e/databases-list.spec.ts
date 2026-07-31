import { test, expect } from '@playwright/test';

test.describe('Databases List Spec', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/databases');
    await expect(page.getByRole('heading', { name: 'Relational Database Inventory' })).toBeVisible({ timeout: 10000 });
  });

  test('should display default list page heading and environment tabs', async ({ page }) => {
    await expect(page.getByRole('button').filter({ hasText: 'Production' })).toBeVisible();
    await expect(page.getByRole('button').filter({ hasText: 'Testing' })).toBeVisible();
    await expect(page.getByRole('button').filter({ hasText: 'Development' })).toBeVisible();
  });

  test('should trigger search filter in real-time', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search databases...');
    await searchInput.fill('non-existent-db-engine');
    await expect(page.getByText('No databases found')).toBeVisible();
  });

  test('should keep the database search field focused while typing continuously', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search databases...');

    await searchInput.click();
    await searchInput.pressSequentially('postgres', { delay: 40 });

    await expect(searchInput).toBeFocused();
    await expect(searchInput).toHaveValue('postgres');
    await expect(searchInput).toBeFocused();
  });
});
