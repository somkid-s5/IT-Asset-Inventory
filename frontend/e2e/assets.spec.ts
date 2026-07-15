import { test, expect } from '@playwright/test';

test.describe('Assets Dashboard', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    // Go directly to assets page
    await page.goto('/dashboard/assets');
    // Wait for the asset page header to be visible using getByRole
    const heading = page.getByRole('heading', { name: 'Hardware & Infrastructure Inventory' });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should display seeded assets in table', async ({ page }) => {
    // Check that our seeded assets are present in the table rows using getByRole
    const table = page.getByRole('table');
    await expect(table).toContainText('db-prod-01');
    await expect(table).toContainText('web-front-lb');
  });

  test('should filter assets using search', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search assets...');
    await expect(searchInput).toBeVisible();

    // Type "db-prod" into the search field
    await searchInput.fill('db-prod');

    // Check that db-prod-01 is visible, but web-front-lb is not using getByRole
    const table = page.getByRole('table');
    await expect(table).toContainText('db-prod-01');
    await expect(table).not.toContainText('web-front-lb');
  });
});
