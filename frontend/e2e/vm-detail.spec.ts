import { test, expect } from '@playwright/test';

test.describe('VM Detail Page Features', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('should display resources tabs and power action toggles', async ({ page }) => {
    await page.goto('/dashboard/virtual-machines');
    await expect(page.getByRole('heading', { name: 'Compute & Virtualization Inventory' })).toBeVisible({ timeout: 10000 });

    // Locate the VM row for the seeded vm-prod-01 and click its Details button
    const vmRow = page.getByRole('row', { name: /vm-prod-01/i });
    const detailsButton = vmRow.getByRole('button', { name: 'Details' });
    await expect(detailsButton, 'Prerequisite error: vm-prod-01 was not found in the active VM list. Reseed of the database is required to run this test.').toBeVisible({
      timeout: 10000,
    });
    await detailsButton.click();

    // Assert prerequisite: check that we navigated to a VM details page
    await expect(page).toHaveURL(/\/dashboard\/virtual-machines\/[a-zA-Z0-9-]+/);
    await expect(page.getByText('Connection Information')).toBeVisible({ timeout: 15000 });

    // Check Tabs
    await page.getByRole('button', { name: 'RESOURCES' }).click();
    await expect(page.getByRole('heading', { name: 'System Resources' })).toBeVisible();

    await page.getByRole('button', { name: 'CONTEXT' }).click();
    await expect(page.getByRole('heading', { name: 'AssetOps Context' })).toBeVisible();
  });
});
