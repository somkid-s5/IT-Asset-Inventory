import { test, expect } from '@playwright/test';

test.describe('Databases CRUD Operations', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/databases');
  });

  test('should create, edit and delete database with confirmations', async ({ page }) => {
    const dbUniqueName = `e2e-db-${Date.now()}`;
    const dbEditedName = `${dbUniqueName}-edited`;

    await expect(page.getByRole('button', { name: 'Add Database' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Add Database' }).click();
    await expect(page.getByRole('heading', { name: 'Register New Database' })).toBeVisible();

    // 1. Validation path: blank submit
    await page.getByRole('button', { name: 'Create Database' }).click();
    // Ensure form is not closed, indicating HTML5 validation stopped submission
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
    await page.getByLabel('Host').fill('e2e-db-host.local');
    await page.getByLabel('IP Address').fill('10.0.1.99');

    // Fill Account Username & Password
    await page.getByLabel('Username').fill('e2e_admin_user');
    await page.getByLabel('Password').fill('E2EAdminPassword2026!');

    // Create Database
    await page.getByRole('button', { name: 'Create Database' }).click();

    // Verify create persistence
    await expect(page.getByText('Database created')).toBeVisible();
    const row = page.getByRole('row').filter({ hasText: dbUniqueName });
    await expect(row).toBeVisible();

    // 2. Edit Database
    const editBtn = row.getByRole('button', { name: 'Edit Database' });
    await editBtn.click();
    await expect(page.getByRole('heading', { name: 'Update Database Details' })).toBeVisible();

    // Edit Name
    await page.getByLabel('Database Name').fill(dbEditedName);
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Verify edit persistence
    await expect(page.getByText('Database updated')).toBeVisible();
    const editedRow = page.getByRole('row').filter({ hasText: dbEditedName });
    await expect(editedRow).toBeVisible();

    // 3. Delete Database & cleanup within the same test
    const menuBtn = editedRow.getByRole('button', { name: 'Database Actions' });
    await menuBtn.click();
    await page.getByRole('menuitem', { name: 'Delete Database' }).click();

    // Confirm Delete
    const confirmBtn = page.getByRole('button', { name: 'Confirm Delete' });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Verify delete absence
    await expect(page.getByText('Database deleted successfully')).toBeVisible();
    await expect(editedRow).not.toBeVisible();
  });
});

test.describe('Databases Role-Based Restrictions', () => {
  test.use({ storageState: 'playwright/.auth/viewer.json' });

  test('should restrict viewer from adding databases', async ({ page }) => {
    await page.goto('/dashboard/databases');
    await expect(page.getByRole('heading', { name: 'Relational Database Inventory' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Add Database' })).not.toBeVisible();
  });
});
