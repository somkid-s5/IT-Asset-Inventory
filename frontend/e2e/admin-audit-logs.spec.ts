import { test, expect } from '@playwright/test';

test.describe('Audit Logs Viewer Spec', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/audit-logs');
    await expect(page).toHaveURL(/\/dashboard\/audit-logs$/);
  });

  test('should display audit logs table headers and search filters', async ({ page }) => {
    // Heading check
    await expect(page.getByRole('heading', { name: 'System Audit Logs' })).toBeVisible();

    // Table elements with semantic column headers
    await expect(page.getByRole('columnheader', { name: 'Date & Time' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'User' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Action' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Details' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'IP Address' })).toBeVisible();

    // Verify search input is present
    const searchInput = page.getByPlaceholder('Search logs by user, action, or details...');
    await expect(searchInput).toBeVisible();
  });

  test('should filter audit logs based on search criteria', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search logs by user, action, or details...');

    // Type non-existent query to verify empty state
    await searchInput.fill('NON_EXISTENT_AUDIT_LOG_ACTION_123456');
    await expect(page.getByText('No audit logs found')).toBeVisible({ timeout: 5000 });

    // Clear search query
    await searchInput.fill('');
    await expect(page.getByText('No audit logs found')).not.toBeVisible();
  });
});
