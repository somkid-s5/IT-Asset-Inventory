import { test, expect } from '@playwright/test';

test.describe('Database Detail View Specs', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('should create, view details, and archive database', async ({ page }) => {
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
    // The list is paginated and sorted by name, so locate the new record via
    // the same search path a user would use in a larger inventory.
    await page.getByPlaceholder('Search databases...').fill(dbUniqueName);
    const row = page.getByRole('row').filter({ hasText: dbUniqueName });
    await expect(row).toBeVisible();

    // Use the semantic details link so the dynamic route can be prefetched.
    await row.getByRole('link', { name: `View details for ${dbUniqueName}` }).click();

    // Verify detail page elements
    await expect(page.getByRole('heading', { name: dbUniqueName })).toBeVisible();
    await expect(page.getByText('Connection Information')).toBeVisible();
    await expect(page.getByText('Accounts & Credentials')).toBeVisible();
    await expect(page.getByText('detail_user')).toBeVisible();
    await expect(page.getByText('detail-db-host.local')).toBeVisible();

    // Clean up: navigate back and archive the database
    await page.goto('/dashboard/databases');
    await expect(page.getByRole('heading', { name: 'Relational Database Inventory' })).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder('Search databases...').fill(dbUniqueName);
    const rowToArchive = page.getByRole('row').filter({ hasText: dbUniqueName });
    await expect(rowToArchive).toBeVisible();

    const menuBtn = rowToArchive.getByRole('button', { name: 'Database Actions' });
    await menuBtn.click();
    await page.getByRole('menuitem', { name: 'Archive Database' }).click();

    const confirmBtn = page.getByRole('button', { name: 'Confirm Archive' });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Verify archive
    await expect(page.getByText('Database archived successfully')).toBeVisible();
    await expect(rowToArchive).not.toBeVisible();
  });
});
