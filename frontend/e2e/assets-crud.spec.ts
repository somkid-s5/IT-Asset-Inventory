import { test, expect } from '@playwright/test';

test.describe('Assets CRUD Operations', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/assets');
    await expect(page.getByRole('button', { name: 'Add Asset' })).toBeVisible({ timeout: 10000 });
  });

  test('should create, edit, and delete an asset successfully', async ({ page }) => {
    const assetName = `E2E Test Switch - ${Date.now()}`;
    const modifiedName = `${assetName} Modified`;

    // 1. Create Asset with validation check
    await page.getByRole('button', { name: 'Add Asset' }).click();

    // Submit blank form to trigger validation
    await page.getByRole('button', { name: 'Create Asset' }).click();
    await expect(page.getByText('Asset name is required')).toBeVisible();

    // Fill form and submit
    await page.getByPlaceholder('Enter asset or host name').fill(assetName);

    // Select Switch type
    await page.getByRole('combobox', { name: 'Type' }).click();
    await page.getByRole('option', { name: 'Switch', exact: true }).click();

    await page.getByPlaceholder('e.g. Rack A1').fill('Rack-99');
    await page.getByPlaceholder('e.g. Data Center 1').fill('Main DC');
    await page.getByRole('button', { name: 'Create Asset' }).click();

    await expect(page.getByText('Asset created successfully')).toBeVisible({ timeout: 5000 });

    const row = page.getByRole('row').filter({ hasText: assetName });
    await expect(row).toBeVisible();

    // 2. Edit Asset
    const editBtn = row.getByRole('button', { name: 'Edit Asset' });
    await editBtn.click();

    await page.getByPlaceholder('Enter asset or host name').fill(modifiedName);
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByText('Asset updated successfully')).toBeVisible();

    const modifiedRow = page.getByRole('row').filter({ hasText: modifiedName });
    await expect(modifiedRow).toBeVisible();

    // 3. Delete Asset
    const menuBtn = modifiedRow.getByRole('button', { name: 'Asset Actions' });
    await menuBtn.click();

    await page.getByRole('menuitem', { name: 'Delete Asset' }).click();

    const confirmBtn = page.getByRole('button', { name: 'Confirm Delete' });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    await expect(page.getByText('Asset deleted successfully')).toBeVisible();
    await expect(modifiedRow).not.toBeVisible();
  });
});
