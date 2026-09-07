import { test, expect } from '@playwright/test';

test.describe('Main Dashboard Home - accepted V1 surface', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: /Applications:/ })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Needs Attention', { exact: true })).toBeVisible();
    await expect(page.getByText('Recently Updated', { exact: true })).toBeVisible();
  });

  test('navigates from accepted V1 summary cards', async ({ page }) => {
    await page.getByRole('link', { name: /Applications:/ }).click();
    await expect(page).toHaveURL(/.*applications/, { timeout: 15000 });

    await page.goto('/dashboard');
    await page.getByRole('link', { name: /Physical Assets:/ }).click();
    await expect(page).toHaveURL(/.*assets/, { timeout: 15000 });

    await page.goto('/dashboard');
    await page.getByRole('link', { name: /Virtual Machines:/ }).click();
    await expect(page).toHaveURL(/.*virtual-machines/, { timeout: 15000 });

    await page.goto('/dashboard');
    await page.getByRole('link', { name: /Databases:/ }).click();
    await expect(page).toHaveURL(/.*databases/, { timeout: 15000 });
  });

  test('refreshes actionable Dashboard data without restoring superseded charts', async ({ page }) => {
    const refreshButton = page.getByRole('button', { name: 'Refresh dashboard' });
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();
    await expect(refreshButton).toBeEnabled();

    await expect(page.getByText('CMDB Distribution', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Recorded asset status', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Needs Attention', { exact: true })).toBeVisible();
    await expect(page.getByText('Recently Updated', { exact: true })).toBeVisible();
  });
});
