import { test, expect } from '@playwright/test';

test.describe('Database Detail View Specs', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('should create, view details, and delete database', async ({ page }) => {
    const dbUniqueName = `e2e-detail-db-${Date.now()}`;

    await page.goto('/dashboard/databases');
    await expect(page.getByRole('heading', { name: 'Relational Database Inventory' })).toBeVisible({ timeout: 10000 });

    // Create a temporary database first
    await page.getByRole('button', { name: 'Add Database' }).click();
    await expect(page.getByRole('heading', { name: 'Register New Database' })).toBeVisible();

    // Fill form details using semantic locators
    await page.getByLabel('Database Name').fill(dbUniqueName);

    // Select Engine
    await page.getByRole('combobox', { name: 'Engine' }).click();
    await page.getByRole('option', { name: 'PostgreSQL', exact: true }).click();

    // Select Environment
    await page.getByRole('combobox', { name: 'Environment' }).click();
    await page.getByRole('option', { name: 'DEV', exact: true }).click();

    // Fill Connection Parameters
    await page.getByLabel('Host').fill('detail-db-host.local');
    await page.getByLabel('IP Address').fill('10.0.1.66');

    // Fill Account Username & Password
    await page.getByLabel('Username').fill('detail_user');
    await page.getByLabel('Password').fill('DetailPass2026!!');

    // Create Database
    await page.getByRole('button', { name: 'Create Database' }).click();

    // Verify database creation
    await expect(page.getByText('Database created')).toBeVisible();
    const row = page.getByRole('row').filter({ hasText: dbUniqueName });
    await expect(row).toBeVisible();

    // Click the database row to open detail view
    await row.click();

    // Verify detail page elements
    await expect(page.getByText('Database Details')).toBeVisible();
    await expect(page.getByText('Database Accounts')).toBeVisible();
    await expect(page.getByText('detail_user')).toBeVisible();
    await expect(page.getByText('detail-db-host.local')).toBeVisible();

    // Clean up: navigate back and delete the database
    await page.goto('/dashboard/databases');
    await expect(page.getByRole('heading', { name: 'Relational Database Inventory' })).toBeVisible({ timeout: 10000 });

    const rowToDelete = page.getByRole('row').filter({ hasText: dbUniqueName });
    await expect(rowToDelete).toBeVisible();

    const menuBtn = rowToDelete.getByRole('button', { name: 'Database Actions' });
    await menuBtn.click();
    await page.getByRole('menuitem', { name: 'Delete Database' }).click();

    const confirmBtn = page.getByRole('button', { name: 'Confirm Delete' });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Verify deletion
    await expect(page.getByText('Database deleted successfully')).toBeVisible();
    await expect(rowToDelete).not.toBeVisible();
  });
});
