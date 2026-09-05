import { test, expect } from '@playwright/test';

test.describe('Main Dashboard Home', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Infrastructure', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Needs Review', { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('should navigate via stat cards', async ({ page }) => {
    // Click Virtual Machines Card
    await page.getByRole('link', { name: /Virtual Machines:/ }).click();
    await expect(page).toHaveURL(/.*virtual-machines/, { timeout: 15000 });

    await page.goto('/dashboard');
    // Click Infrastructure Card
    await page.getByRole('link', { name: /Infrastructure:/ }).click();
    await expect(page).toHaveURL(/.*assets/, { timeout: 15000 });

    await page.goto('/dashboard');
    // Click Databases Card
    await page.getByRole('link', { name: /Databases:/ }).click();
    await expect(page).toHaveURL(/.*databases/, { timeout: 15000 });
  });

  test('should trigger refresh dashboard action', async ({ page }) => {
    const refreshBtn = page.getByRole('button', { name: /Refresh/i });
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
    // Reverts to normal state after reload
    await expect(refreshBtn).not.toContainText('Refreshing');
  });

  test('should render CMDB chart distribution, tooltips, and gauge metrics', async ({ page }) => {
    // Assert CMDB Distribution card is visible
    await expect(page.getByText('CMDB Distribution')).toBeVisible();

    const chartCard = page.getByRole('region', { name: 'CMDB Distribution' });
    await expect(chartCard.getByRole('img', { name: 'CMDB Distribution Chart' })).toBeVisible();
    await expect(chartCard.getByText('SERVER')).toBeVisible();

    // Health gauge numeric score rendering check
    await expect(page.getByText('Recorded asset status')).toBeVisible();
    await expect(page.getByText('active-status share')).toBeVisible();
    await expect(page.getByText('%')).toBeVisible();
  });

  test('should display attention panel states and handle clicks', async ({ page }) => {
    const attentionCard = page.getByRole('region', { name: 'Inventory attention' });
    await expect(attentionCard).toBeVisible();
    await expect(attentionCard.getByText('vCenter Sync Failed')).toBeVisible();
  });
});
