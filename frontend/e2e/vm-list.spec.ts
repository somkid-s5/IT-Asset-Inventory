import { test, expect } from '@playwright/test';

test.describe('Virtual Machines List Spec', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/virtual-machines');
    await expect(page.getByRole('heading', { name: 'Compute & Virtualization Inventory' })).toBeVisible({ timeout: 10000 });
  });

  test('should toggle between PENDING, ACTIVE, and ORPHANED views', async ({ page }) => {
    // Click Pending Tab
    await page.getByRole('button', { name: 'Pending' }).click();
    await expect(page).toHaveURL(/view=PENDING/);
    await expect(page.getByRole('columnheader', { name: 'Discovered VM Name' })).toBeVisible();

    // Click Active Tab
    await page.getByRole('button', { name: 'Active' }).click();
    await expect(page).toHaveURL(/view=ACTIVE/);
    await expect(page.getByRole('columnheader', { name: 'System Name' })).toBeVisible();

    // Click Orphaned Tab
    await page.getByRole('button', { name: 'Orphaned' }).click();
    await expect(page).toHaveURL(/view=ORPHANED/);
    await expect(page.getByRole('columnheader', { name: 'Last Seen' })).toBeVisible();
  });

  test('should display search functionality in VMs list', async ({ page }) => {
    // Search in Active (default)
    const searchInputActive = page.getByPlaceholder('Search VM name, IP, host...');
    const inventorySearch = page.waitForRequest((request) => {
      if (!request.url().includes('/api/vm/inventory')) return false;
      return new URL(request.url()).searchParams.get('q') === 'non-existent-vm-active-search';
    });
    await expect(searchInputActive).toBeVisible();
    await searchInputActive.fill('non-existent-vm-active-search');
    await inventorySearch;
    await expect(page).toHaveURL(/q=non-existent-vm-active-search/);
    await expect(page.getByRole('heading', { name: 'No virtual machines found' })).toBeVisible();

    // Switch to Pending and search
    await page.getByRole('button', { name: 'Pending' }).click();
    const searchInputPending = page.getByPlaceholder('Search VM name, IP...');
    await expect(searchInputPending).toBeVisible();
    await searchInputPending.fill('non-existent-vm-pending-search');
    await expect(page.getByRole('heading', { name: 'No virtual machines found' })).toBeVisible();

    // Switch to Orphaned and search
    await page.getByRole('button', { name: 'Orphaned' }).click();
    const searchInputOrphaned = page.getByPlaceholder('Search VM name...');
    await expect(searchInputOrphaned).toBeVisible();
    await searchInputOrphaned.fill('non-existent-vm-orphaned-search');
    await expect(page.getByRole('heading', { name: 'No virtual machines found' })).toBeVisible();
  });

  test('should keep the search field focused while typing continuously', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search VM name, IP, host...');

    await searchInput.click();
    await searchInput.pressSequentially('vm-search-focus');

    await expect(searchInput).toHaveValue('vm-search-focus');
    await expect(searchInput).toBeFocused();
  });
});
