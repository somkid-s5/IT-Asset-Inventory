import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/viewer.json';

setup('authenticate as viewer', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('test_viewer');
  await page.getByLabel('Password').fill('AssetOpsNewPass2026!!');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/.*dashboard/);
  await page.context().storageState({ path: authFile });
});
