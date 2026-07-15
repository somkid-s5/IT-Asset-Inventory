import { test, expect } from '@playwright/test';

test.describe('Data Quality Spec', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/data-quality');
    await expect(page.getByText('Records needing attention', { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('should display metric cards and asset lists with validation issues', async ({ page }) => {
    await expect(page.getByText('Inventory records', { exact: true })).toBeVisible();
    await expect(page.getByText('Complete records', { exact: true })).toBeVisible();
    await expect(page.getByText('Need review', { exact: true })).toBeVisible();

    await expect(page.getByText('Database records needing attention')).toBeVisible();
    await expect(page.getByText('Virtual machine records needing attention')).toBeVisible();
  });
});
