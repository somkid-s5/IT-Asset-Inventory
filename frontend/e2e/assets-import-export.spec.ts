import { test, expect } from '@playwright/test';

test.describe('Assets legacy bulk/import/export regression guard', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('keeps superseded Asset bulk and ordinary export actions out of the V1 surface', async ({ page }) => {
    await page.goto('/dashboard/assets');
    await expect(page.getByRole('button', { name: /Add Asset/i })).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('button', { name: /Import/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Bulk Update/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Export CSV/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Export Assets/i })).toHaveCount(0);
  });
});
