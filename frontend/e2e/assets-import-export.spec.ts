import { test, expect } from '@playwright/test';

test.describe('Assets Export Spec', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/assets');
    await expect(page.getByRole('button', { name: 'Export' })).toBeVisible({ timeout: 10000 });
  });

  test('should trigger download on export action', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: 'Export' });
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      exportButton.click()
    ]);
    expect(download.suggestedFilename()).toContain('.csv');
  });

});
