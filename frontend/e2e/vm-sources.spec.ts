import { test, expect } from '@playwright/test';

test.describe('vCenter Sources Management Spec', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/virtual-machines/sources');
    await expect(page.getByRole('heading', { name: 'vCenter Sources', exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('should display add source button and form dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'Add vCenter' }).click();
    await expect(page.getByRole('heading', { name: 'Add vCenter Source' })).toBeVisible();

    // Check validation of testing connection before save
    const saveButton = page.getByRole('button', { name: 'Save', exact: true });
    await expect(saveButton).toBeDisabled();

    // Click test without details, should show error toast or notification
    await page.getByRole('button', { name: 'Test', exact: true }).click();
    await expect(page.getByText('Endpoint is required for testing')).toBeVisible();
  });
});
