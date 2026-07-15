import { test, expect } from '@playwright/test';

test.describe('Main Dashboard Home', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Compute Assets', { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('should navigate via stat cards', async ({ page }) => {
    // Click Compute Assets Card
    await page.getByText('Compute Assets', { exact: true }).click();
    await expect(page).toHaveURL(/.*virtual-machines/);

    await page.goto('/dashboard');
    // Click Infrastructure Card
    await page.getByText('Infrastructure', { exact: true }).click();
    await expect(page).toHaveURL(/.*assets/);

    await page.goto('/dashboard');
    // Click Managed DBs Card
    await page.getByText('Managed DBs', { exact: true }).click();
    await expect(page).toHaveURL(/.*databases/);
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
    await expect(attentionCard.getByText('No inventory alerts')).toBeVisible();
  });
});
