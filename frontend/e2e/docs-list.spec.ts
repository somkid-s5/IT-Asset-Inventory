import { test, expect } from '@playwright/test';

test.describe('Knowledge Base List Features', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/docs');
    await expect(page.getByRole('heading', { name: 'SysOps Knowledge Base' })).toBeVisible();
  });

  test('should display article list and category chips', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Document Categories' })).toBeVisible();
    await expect(page.getByText('Total Documents')).toBeVisible();
    // Verify categories or empty state is visible without conditional blocks
    await expect(
      page.getByRole('heading', { name: 'General' })
        .or(page.getByRole('heading', { name: 'No Documentation Yet' }))
    ).toBeVisible();
  });

  test('should filter articles by search keyword', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search knowledge base, manuals, or topics...');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('nonexistent-kb-article-search-query-value');
    // Expect empty search state
    await expect(
      page.getByRole('heading', { name: 'No categories found for "nonexistent-kb-article-search-query-value"' })
    ).toBeVisible();
  });
});
