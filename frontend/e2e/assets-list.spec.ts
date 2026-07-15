import { test, expect } from '@playwright/test';

test.describe('Assets List Page Features', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/assets');
    const heading = page.getByRole('heading', { name: 'Hardware & Infrastructure Inventory' });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should filter assets by type tabs', async ({ page }) => {
    // Click Servers Tab
    await page.getByRole('button', { name: 'Servers' }).click();
    await expect(page.getByRole('table')).toContainText('db-prod-01');
    await expect(page.getByRole('table')).toContainText('web-front-lb');

    // Click Switches Tab
    await page.getByRole('button', { name: 'Switches' }).click();
    await expect(page.getByRole('table')).toContainText('switch-core-01');
    await expect(page.getByRole('table')).not.toContainText('db-prod-01');
    await expect(page.getByRole('table')).not.toContainText('web-front-lb');
  });

  test('should search asset by different keywords', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search assets...');
    const table = page.getByRole('table');

    // Search by Name
    await searchInput.fill('db-prod');
    await expect(table).toContainText('db-prod-01');
    await expect(table).not.toContainText('web-front-lb');

    // Search by IP
    await searchInput.fill('10.0.2.12');
    await expect(table).toContainText('web-front-lb');
    await expect(table).not.toContainText('db-prod-01');

    // Search by invalid string
    await searchInput.fill('nonexistent-asset-query');
    await expect(page.getByText('No assets found')).toBeVisible();
  });

  test('should sort columns ascending and descending', async ({ page }) => {
    const nameHeader = page.getByRole('button', { name: 'Asset Name' });
    const seededNames = page.getByTestId('asset-name').filter({ hasText: /^(db-prod-01|web-front-lb)$/ });

    // Sort Ascending
    await nameHeader.click();
    await expect(seededNames).toHaveText(['db-prod-01', 'web-front-lb']);

    // Sort Descending
    await nameHeader.click();
    await expect(seededNames).toHaveText(['web-front-lb', 'db-prod-01']);
  });

  test('should toggle column visibility dynamically', async ({ page }) => {
    // Open Columns dropdown using the columns button
    const columnsButton = page.getByRole('button', { name: 'Toggle Columns' });
    await columnsButton.click();

    let rackCheckbox = page.getByRole('menuitemcheckbox', { name: 'Rack' });
    await expect(rackCheckbox).toBeVisible();
    await expect(rackCheckbox).toBeChecked();

    const rackHeader = page.getByRole('columnheader', { name: 'Rack' });

    // Uncheck Rack column
    await rackCheckbox.click();
    await expect(rackHeader).not.toBeVisible();

    // Press Escape, assert current rackCheckbox not visible
    await page.keyboard.press('Escape');
    await expect(rackCheckbox).not.toBeVisible();

    // Reopen Toggle Columns
    await columnsButton.click();

    // Locate Rack menuitemcheckbox again and assert not checked
    rackCheckbox = page.getByRole('menuitemcheckbox', { name: 'Rack' });
    await expect(rackCheckbox).toBeVisible();
    await expect(rackCheckbox).not.toBeChecked();

    // Click it to recheck
    await rackCheckbox.click();

    // Close menu with Escape and assert header is visible
    await page.keyboard.press('Escape');
    await expect(rackHeader).toBeVisible();
  });

  test('should manage bulk selections and actions', async ({ page }) => {
    const headerCheckbox = page.getByRole('checkbox', { name: 'Select all' });

    // Check bulk selection
    await headerCheckbox.check();
    const bulkPanel = page.getByText(/selected/i);
    await expect(bulkPanel).toBeVisible();

    // Uncheck bulk selection
    await headerCheckbox.uncheck();
    await expect(bulkPanel).not.toBeVisible();
  });

  test('should navigate to details on row click', async ({ page }) => {
    const row = page.getByRole('row').filter({ hasText: 'db-prod-01' });
    await row.click();
    await expect(page).toHaveURL(/\/dashboard\/assets\/[a-zA-Z0-9-]+/);
  });
});
