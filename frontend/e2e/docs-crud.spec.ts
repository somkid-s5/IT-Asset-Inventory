import { test, expect } from '@playwright/test';

test.describe('KB Document CRUD Operations', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('should perform full CRUD operations on knowledge documents', async ({ page }) => {
    // Navigate to docs dashboard
    await page.goto('/dashboard/docs');
    const newDocButton = page.getByRole('button', { name: /New Document/i });
    await expect(newDocButton).toBeVisible();
    await newDocButton.click();

    // Verify redirects to /new
    await page.waitForURL('**/dashboard/docs/new', { timeout: 15000 });
    const titleInput = page.getByPlaceholder('e.g. How to configure the core switch...');
    await expect(titleInput).toBeVisible();

    // Trigger validations
    const publishButton = page.getByRole('button', { name: /Publish Document/i });
    await publishButton.click();
    await expect(page.getByText('Please fill all required fields')).toBeVisible();

    // Fill form
    const uniqueTitle = `E2E CRUD Doc ${Date.now()}`;
    await titleInput.fill(uniqueTitle);

    // Select category dropdown
    const categorySelect = page.getByRole('combobox', { name: 'Category' });
    await categorySelect.click();

    // Choose "General"
    const generalOption = page.getByRole('option', { name: 'General' });
    await generalOption.click();

    // Fill Content (BlockNote Editor wrapped in kb-editor testid)
    const editor = page.getByTestId('kb-editor').getByRole('textbox');
    await expect(editor).toBeVisible({ timeout: 15000 });
    await editor.click();
    await page.keyboard.type('Initial content for the document.');

    // Save/Publish
    await publishButton.click();
    await expect(page.getByText('Document published')).toBeVisible();

    // Verify it exists in list/dashboard
    await page.goto('/dashboard/docs');
    await expect(page.getByRole('heading', { name: 'SysOps Knowledge Base' })).toBeVisible();

    // Search for the newly created document
    const searchInput = page.getByPlaceholder('Search knowledge base, manuals, or topics...');
    await searchInput.fill(uniqueTitle);
    await searchInput.fill(''); // Clear search so General category card is visible

    // Navigate to the Category where it exists
    const categoryCard = page.getByRole('heading', { name: 'General' });
    await categoryCard.scrollIntoViewIfNeeded();
    await categoryCard.click();

    // Click the title card
    const docLink = page.getByRole('heading', { name: uniqueTitle });
    await expect(docLink).toBeVisible();
    await docLink.click();

    // Verify detail view page
    await expect(page.getByRole('heading', { name: uniqueTitle, level: 1 })).toBeVisible();

    // Edit Document
    const editIconBtn = page.getByRole('button', { name: 'Edit Document' });
    await expect(editIconBtn).toBeVisible();
    await editIconBtn.click();

    // Edit form page
    const updatedTitle = `${uniqueTitle} - Updated`;
    const titleEditInput = page.getByPlaceholder('Enter title...');
    await expect(titleEditInput).toBeVisible();
    await titleEditInput.fill(updatedTitle);

    const saveChangesButton = page.getByRole('button', { name: /Save Changes/i });
    await saveChangesButton.click();

    // Wait for redirect back to details page (URL path ending with document ID)
    await page.waitForURL(/\/dashboard\/docs\/[^/]+$/, { timeout: 15000 });

    // Verify updated title on details page
    await expect(page.getByRole('heading', { name: updatedTitle, level: 1 })).toBeVisible();

    // Clean up / Delete Document
    // Dialog confirm needs to be handled via Page dialog event
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('delete this document?');
      await dialog.accept();
    });

    const deleteButton = page.getByRole('button', { name: /Delete Document/i });
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Should redirect back to /docs dashboard
    await page.waitForURL('**/dashboard/docs', { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'SysOps Knowledge Base' })).toBeVisible();
  });
});
