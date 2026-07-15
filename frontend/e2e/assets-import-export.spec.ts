import { test, expect } from '@playwright/test';

test.describe('Assets Import & Export Spec', () => {
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

  test('should handle CSV import preview and validation paths', async ({ page }) => {
    // Hidden file input is standard, we locate it by its test ID
    const fileInput = page.getByTestId('file-import-input');

    // 1. Invalid CSV format (no valid rows or columns)
    const invalidCSV = "wrongheader1,wrongheader2\nval1,val2";
    await fileInput.setInputFiles({
      name: 'invalid.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(invalidCSV),
    });

    // Check invalid preview validation alert
    await expect(page.getByText('No valid rows found')).toBeVisible({ timeout: 5000 });

    // 2. CSV exceeding row limit (> 200)
    const longCSVHeader = "name,type\n";
    const longCSVRows = Array.from({ length: 205 }, (_, i) => `Asset-${i},SERVER`).join('\n');
    await fileInput.setInputFiles({
      name: 'too_long.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(longCSVHeader + longCSVRows),
    });

    await expect(page.getByText('Import is limited to 200 rows')).toBeVisible({ timeout: 5000 });
  });
});
