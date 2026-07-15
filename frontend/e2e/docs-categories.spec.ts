import { test, expect } from '@playwright/test';

test.describe('KB Categories Management Spec', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/docs');
    const manageBtn = page.getByRole('button', { name: /Manage Categories/i });
    await expect(manageBtn).toBeVisible();
    await manageBtn.click();
  });

  test('should display categories list and add form, and handle new category addition', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Knowledge Categories' })).toBeVisible();
    const inputField = dialog.getByPlaceholder('New category name...');
    await expect(inputField).toBeVisible();

    // Fill unique name
    const categoryName = `Temp Cat ${Date.now()}`;
    await inputField.fill(categoryName);

    // Click submit
    const submitButton = dialog.getByRole('button', { name: 'Add Category' });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Verify it is added to list
    const categoryItem = dialog.getByText(categoryName, { exact: true });
    await expect(categoryItem).toBeVisible();

    // Clean up
    page.once('dialog', async (dialogObj) => {
      expect(dialogObj.message()).toContain('Delete this category?');
      await dialogObj.accept();
    });

    // Hover to reveal delete button, then click delete button next to that item using semantic aria-label
    await categoryItem.hover();
    const deleteBtn = dialog.getByRole('button', { name: `Delete ${categoryName}` });
    await deleteBtn.click();
    await expect(categoryItem).not.toBeVisible();
  });
});
