import { test, expect } from '@playwright/test';

test.describe('vCenter Sources Management Spec', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/virtual-machines/sources');
    await expect(page.getByRole('heading', { name: 'vCenter Sources', exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('should display add source button and form dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'Add vCenter' }).click();
    await expect(page.getByRole('heading', { name: 'Add vCenter Source' })).toBeVisible();

    // Check validation of testing connection before save
    const saveButton = page.getByRole('button', { name: 'Save', exact: true });
    await expect(saveButton).toBeDisabled();

    // Click test without details, should show error toast or notification
    await page.getByRole('button', { name: 'Test', exact: true }).click();
    await expect(page.getByText('Endpoint is required for testing')).toBeVisible();
  });
});

test.describe('vCenter Sources V1.1 credential and lifecycle acceptance', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('covers create/test, metadata preservation, connection re-test, sync, archive/restore, and audit evidence', async ({ page }) => {
    test.setTimeout(120_000);

    let source = {
      id: 'source-v1-1',
      name: 'acceptance-vcenter',
      version: '8.0',
      endpoint: 'https://vcenter.acceptance.local',
      hasCredential: true,
      vmCount: 2,
      status: 'HEALTHY',
      syncInterval: 15,
      lastSyncAt: 'Just now',
      notes: 'Initial acceptance source',
    };
    let connectionTests = 0;
    let metadataUpdateBody: Record<string, unknown> | null = null;

    await page.addInitScript(() => {
      window.localStorage.setItem(
        'user',
        JSON.stringify({
          id: 'admin-1',
          username: 'admin',
          displayName: 'Acceptance Admin',
          avatarSeed: 'acceptance-admin',
          role: 'ADMIN',
        }),
      );
    });
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        json: {
          user: {
            id: 'admin-1',
            username: 'admin',
            displayName: 'Acceptance Admin',
            avatarSeed: 'acceptance-admin',
            role: 'ADMIN',
          },
        },
      });
    });

    await page.route('**/api/vm/sources', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: [source] });
        return;
      }

      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as {
          name?: string;
          endpoint?: string;
          syncInterval?: number;
          notes?: string;
        };
        source = {
          ...source,
          name: body.name ?? source.name,
          endpoint: body.endpoint ?? source.endpoint,
          syncInterval: body.syncInterval ?? source.syncInterval,
          notes: body.notes ?? source.notes,
          id: 'source-v1-1',
          hasCredential: true,
          status: 'READY_TO_SYNC',
        };
        await route.fulfill({ json: source });
        return;
      }

      await route.continue();
    });
    await page.route('**/api/vm/sources/test-connection', async (route) => {
      connectionTests += 1;
      await route.fulfill({
        json: {
          success: true,
          message: 'Connected to vcenter.acceptance.local successfully',
          version: '8.0',
        },
      });
    });
    await page.route('**/api/vm/sources/source-v1-1*', async (route) => {
      const method = route.request().method();
      if (method === 'PATCH') {
        const body = route.request().postDataJSON() as Record<string, unknown>;
        if (route.request().url().includes('/archive')) {
          source = { ...source, status: 'ARCHIVED' };
        } else if (route.request().url().includes('/restore')) {
          source = { ...source, status: 'READY_TO_SYNC' };
        } else {
          metadataUpdateBody = body;
          source = { ...source, ...body } as typeof source;
        }
        await route.fulfill({ json: source });
        return;
      }
      await route.continue();
    });
    await page.route('**/api/vm/sources/source-v1-1/archive', async (route) => {
      source = { ...source, status: 'ARCHIVED' };
      await route.fulfill({ json: source });
    });
    await page.route('**/api/vm/sources/source-v1-1/restore', async (route) => {
      source = { ...source, status: 'READY_TO_SYNC' };
      await route.fulfill({ json: source });
    });
    await page.route('**/api/vm/sources/source-v1-1/sync', async (route) => {
      await route.fulfill({
        json: { success: true, message: 'Synced 2 VMs from acceptance-vcenter' },
      });
    });
    await page.route('**/api/audit-logs**', async (route) => {
      await route.fulfill({
        json: {
          data: [
            { id: 'audit-1', action: 'RESTORE_SOURCE', targetId: source.id, details: 'Restored vCenter source', timestamp: new Date().toISOString(), user: null, ipAddress: null },
            { id: 'audit-2', action: 'ARCHIVE_SOURCE', targetId: source.id, details: 'Archived vCenter source', timestamp: new Date().toISOString(), user: null, ipAddress: null },
            { id: 'audit-3', action: 'VCENTER_SYNC', targetId: source.id, details: 'Manual sync of vCenter source', timestamp: new Date().toISOString(), user: null, ipAddress: null },
            { id: 'audit-4', action: 'UPDATE_SOURCE', targetId: source.id, details: 'Updated vCenter source', timestamp: new Date().toISOString(), user: null, ipAddress: null },
            { id: 'audit-5', action: 'CREATE_SOURCE', targetId: source.id, details: 'Created vCenter source', timestamp: new Date().toISOString(), user: null, ipAddress: null },
          ],
          meta: { total: 5, page: 1, limit: 20, totalPages: 1 },
          summary: {
            totalEvents: 5,
            todayEvents: 5,
            deleteEvents: 0,
            uniqueActors: 1,
            scope: 'all events matching the current filters',
          },
        },
      });
    });

    await page.goto('/dashboard/virtual-machines/sources');
    await expect(page.getByText('acceptance-vcenter', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Add vCenter' }).click();
    const createDialog = page.getByRole('dialog', { name: 'Add vCenter Source' });
    const createFields = createDialog.getByRole('textbox');
    await createFields.nth(0).fill('acceptance-vcenter');
    await createFields.nth(1).fill('https://vcenter.acceptance.local');
    await createFields.nth(2).fill('svc-acceptance');
    await createFields.nth(3).fill('test-password');
    await createDialog.getByRole('button', { name: 'Test', exact: true }).click();
    await expect(createDialog.getByText('Connection Verified', { exact: true })).toBeVisible();
    await createDialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('vCenter source created', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Edit acceptance-vcenter' }).click();
    const editDialog = page.getByRole('dialog', { name: 'Edit vCenter Source' });
    await expect(editDialog.getByPlaceholder('Leave blank to preserve saved password')).toHaveValue('');
    await editDialog.getByRole('textbox').nth(4).fill('Metadata-only update');
    await expect(editDialog.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
    await editDialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('vCenter source updated', { exact: true }).last()).toBeVisible();
    expect(metadataUpdateBody).toMatchObject({ notes: 'Metadata-only update' });

    await page.getByRole('button', { name: 'Edit acceptance-vcenter' }).click();
    const connectionEditDialog = page.getByRole('dialog', { name: 'Edit vCenter Source' });
    await connectionEditDialog.getByRole('textbox').nth(1).fill('https://vcenter-new.acceptance.local');
    await connectionEditDialog.getByRole('textbox').nth(2).fill('svc-new');
    await connectionEditDialog.getByRole('textbox').nth(3).fill('new-password');
    await expect(connectionEditDialog.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
    await connectionEditDialog.getByRole('button', { name: 'Test', exact: true }).click();
    await expect(connectionEditDialog.getByText('Connection Verified', { exact: true })).toBeVisible();
    await connectionEditDialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('vCenter source updated', { exact: true }).last()).toBeVisible();
    expect(connectionTests).toBe(2);

    await page.getByRole('button', { name: 'More actions for acceptance-vcenter' }).click();
    await page.getByRole('menuitem', { name: 'Sync' }).click();
    await expect(page.getByText('Synced 2 VMs from acceptance-vcenter', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'More actions for acceptance-vcenter' }).click();
    await page.getByRole('menuitem', { name: 'Archive' }).click();
    const archiveDialog = page.getByRole('dialog', { name: 'Archive Source' });
    await archiveDialog.getByRole('button', { name: 'Archive', exact: true }).click();
    await expect(page.getByText('Archived', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'More actions for acceptance-vcenter' }).click();
    await page.getByRole('menuitem', { name: 'Restore' }).click();
    await expect(page.getByText('Ready to sync', { exact: true })).toBeVisible();

    await page.goto('/dashboard/audit-logs');
    for (const action of ['Create Source', 'Update Source', 'Vcenter Sync', 'Archive Source', 'Restore Source']) {
      await expect(page.getByRole('table').getByText(action, { exact: true })).toBeVisible();
    }
  });
});
