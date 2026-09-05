import { test, expect } from '@playwright/test';

test.describe('Data Quality Spec', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/data-quality');
    await expect(page).toHaveURL(/\/dashboard\/data-quality$/);
    await expect(page.getByRole('heading', { name: 'Records that need attention' })).toBeVisible({ timeout: 10000 });
  });

  test('should show actionable quality summaries and issue groups', async ({ page }) => {
    await expect(page.getByText('Inventory readiness', { exact: true })).toBeVisible();
    await expect(page.getByText('Needs review', { exact: true })).toBeVisible();
    await expect(page.getByText('Assets issues', { exact: true })).toBeVisible();
    await expect(page.getByText('Databases', { exact: true })).toBeVisible();
    const main = page.getByRole('main');
    await expect(main.getByText('Assets', { exact: true })).toBeVisible();
    await expect(main.getByText('Virtual Machines', { exact: true })).toBeVisible();
  });
});
