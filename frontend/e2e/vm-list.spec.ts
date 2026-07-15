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
    await expect(page.getByRole('columnheader', { name: 'Discovered VM Name' })).toBeVisible();

    // Click Active Tab
    await page.getByRole('button', { name: 'Active' }).click();
    await expect(page.getByRole('columnheader', { name: 'System Name' })).toBeVisible();

    // Click Orphaned Tab
    await page.getByRole('button', { name: 'Orphaned' }).click();
    await expect(page.getByRole('columnheader', { name: 'Last Seen' })).toBeVisible();
  });

  test('should display search functionality in VMs list', async ({ page }) => {
    // Search in Active (default)
    const searchInputActive = page.getByPlaceholder('Search VM name, IP, host...');
    await expect(searchInputActive).toBeVisible();
    await searchInputActive.fill('non-existent-vm-active-search');
    await expect(page.getByRole('heading', { name: 'No active VMs found' })).toBeVisible();

    // Switch to Pending and search
    await page.getByRole('button', { name: 'Pending' }).click();
    const searchInputPending = page.getByPlaceholder('Search VM name, IP...');
    await expect(searchInputPending).toBeVisible();
    await searchInputPending.fill('non-existent-vm-pending-search');
    await expect(page.getByRole('heading', { name: 'No pending VMs' })).toBeVisible();

    // Switch to Orphaned and search
    await page.getByRole('button', { name: 'Orphaned' }).click();
    const searchInputOrphaned = page.getByPlaceholder('Search VM name...');
    await expect(searchInputOrphaned).toBeVisible();
    await searchInputOrphaned.fill('non-existent-vm-orphaned-search');
    await expect(page.getByRole('heading', { name: 'No orphaned VMs found' })).toBeVisible();
  });
});
