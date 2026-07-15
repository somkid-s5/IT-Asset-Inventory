import { test, expect } from '@playwright/test';

test.describe('Asset Detail Management', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    // Navigate to db-prod-01 details
    await page.goto('/dashboard/assets');
    const assetCell = page.getByRole('cell', { name: 'db-prod-01', exact: true });
    await expect(assetCell).toBeVisible({ timeout: 15000 });
    await assetCell.click();

    const credentialSection = page.getByText('Access Interfaces & Credentials');
    await expect(credentialSection).toBeVisible({ timeout: 25000 });
  });

  test('should display asset properties and breadcrumbs correctly', async ({ page }) => {
    await expect(page.getByRole('main').getByRole('heading', { name: 'db-prod-01' })).toBeVisible();
    await expect(page.getByText('SERVER', { exact: true })).toBeVisible();
  });

  test('should manage notes on asset', async ({ page }) => {
    const noteContent = `Unique E2E Note - ${Date.now()}`;
    const textarea = page.getByPlaceholder('Add operational notes... (Markdown supported)');
    await textarea.fill(noteContent);

    const addNoteBtn = page.getByRole('button', { name: 'Add Note' });
    await addNoteBtn.click();

    // Select the newly added note text paragraph in notes listing specifically and verify it is visible.
    const noteElement = page.getByText(noteContent);
    await expect(noteElement).toBeVisible();

    // Clean up if UI supports deletion (which it does via window.confirm)
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    const deleteBtn = page.getByRole('article')
      .filter({ hasText: noteContent })
      .getByRole('button', { name: 'Delete Note' });

    await deleteBtn.click();
    await expect(noteElement).not.toBeVisible();
  });
});
