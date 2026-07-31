import { test, expect } from '@playwright/test';

test.describe('Data Quality Spec', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/data-quality');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('Needs Review', { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('should use the dashboard summary instead of a separate data quality page', async ({ page }) => {
    await expect(page.getByText('CMDB Distribution', { exact: true })).toBeVisible();
  });
});
