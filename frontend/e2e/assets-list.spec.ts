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

  test('should keep the search field focused while typing continuously', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search assets...');

    await searchInput.click();
    await searchInput.pressSequentially('switch-core-01', { delay: 40 });

    await expect(searchInput).toBeFocused();
    await expect(searchInput).toHaveValue('switch-core-01');
    await expect(page.getByRole('table')).toContainText('switch-core-01');
    await expect(searchInput).toBeFocused();
  });

  test('should paginate assets from the server', async ({ page }) => {
    const pageSize = page.getByRole('combobox');
    await pageSize.selectOption('5');

    await expect(page.getByText(/Total \d+ items/)).toBeVisible();
    await expect(page.getByText(/Page 1 of \d+/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next page' })).toBeEnabled();

    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.getByText(/Page 2 of \d+/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Previous page' })).toBeEnabled();
  });

  test('should keep layer-specific Env and Version out of the asset table', async ({ page }) => {
    const table = page.getByRole('table');
    await expect(table.getByRole('columnheader', { name: 'Env' })).not.toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Version' })).not.toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Asset ID' })).toBeVisible();
  });

  test('should sort columns ascending and descending', async ({ page }) => {
    await page.getByRole('combobox').selectOption('50');
    const nameHeader = page.getByRole('button', { name: 'Asset Name' });
    const seededRows = page.getByRole('row').filter({ hasText: /DEV-ASSET-001|DEV-ASSET-002/ });
    const seededNames = seededRows.getByTestId('asset-name');

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
    await page.getByPlaceholder('Search assets...').fill('db-prod-01');
    const assetRow = page.getByRole('row').filter({ hasText: 'DEV-ASSET-001' });
    await expect(assetRow).toBeVisible();
    await assetRow.click();
    await expect(page).toHaveURL(/\/dashboard\/assets\/[a-zA-Z0-9-]+/, { timeout: 15000 });
  });
});
