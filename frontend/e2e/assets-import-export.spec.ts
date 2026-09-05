import { test, expect } from '@playwright/test';
import { getE2eCredentials } from './auth-credentials';

test.describe('Assets Export Spec', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/export');
    await expect(page.getByRole('heading', { name: 'Detailed inventory workbook' })).toBeVisible({ timeout: 10000 });
  });

  test('should trigger download on export action', async ({ page }) => {
    const credentials = getE2eCredentials('admin');
    await page.getByLabel('Confirm your account password').fill(credentials.password);
    await page.getByLabel('Workbook password').fill('E2EWorkbookPassword2026!');
    await page.getByLabel('Confirm workbook password').fill('E2EWorkbookPassword2026!');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download encrypted XLSX' }).click()
    ]);
    expect(download.suggestedFilename()).toContain('.xlsx');
  });

});
