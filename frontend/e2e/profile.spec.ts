import { test, expect } from '@playwright/test';

test.describe('Profile & Security', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/profile');
    await expect(page.getByLabel('Display Name')).toBeVisible({ timeout: 10000 });
  });

  test('should update display name and show success toast', async ({ page }) => {
    const nameInput = page.getByLabel('Display Name');
    await nameInput.fill('Updated Admin Name');
    await page.getByRole('button', { name: 'Save Profile' }).click();

    const notifications = page.getByLabel('Notifications alt+T');
    await expect(notifications).toContainText('Profile updated');
    await expect(nameInput).toHaveValue('Updated Admin Name');

    // Cleanup: restore display name to original state
    await nameInput.fill('Infra Admin');
    await page.getByRole('button', { name: 'Save Profile' }).click();
    await expect(notifications).toContainText('Profile updated');
    await expect(nameInput).toHaveValue('Infra Admin');
  });

  test('should validate empty display name', async ({ page }) => {
    const nameInput = page.getByLabel('Display Name');
    await expect(nameInput).toHaveAttribute('required', '');
  });

  test('should randomize avatar seed', async ({ page }) => {
    const avatarImg = page.getByRole('img', { name: 'Profile Preview Avatar' });
    await expect(avatarImg).toBeVisible();
    const initialSrc = await avatarImg.getAttribute('src');

    const randomizeBtn = page.getByRole('button', { name: 'Randomize' });
    await randomizeBtn.click();

    // expect.poll on src until it differs
    await expect.poll(async () => {
      return await avatarImg.getAttribute('src');
    }).not.toBe(initialSrc);
  });

  test('should handle avatar upload flow, validation limits, and removal', async ({ page }) => {
    // 1. Upload invalid non-image file (like a PDF or mock data)
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Upload Photo' }).click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: 'document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('pdf-data'),
    });

    // Expect toast validation error in container
    const notifications = page.getByLabel('Notifications alt+T');
    await expect(notifications).toContainText('Please upload an image file');

    // 2. Upload valid image
    const fileChooserPromise2 = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Upload Photo' }).click();
    const fileChooser2 = await fileChooserPromise2;

    await fileChooser2.setFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-image-data-here-mock-image'),
    });

    // The "Remove" button should appear since avatarImage is set now
    const removeBtn = page.getByRole('button', { name: 'Remove' });
    await expect(removeBtn).toBeVisible();

    // 3. Remove photo
    await removeBtn.click();
    await expect(removeBtn).not.toBeVisible();
  });

  test('should change password with password policy checks', async ({ page }) => {
    // Use the current new password from setup
    await page.getByLabel('Current Password').fill('AssetOpsNewPass2026!!');
    await page.getByLabel(/^New Password/).fill('Short');
    await page.getByLabel('Confirm New Password').fill('Short');
    await page.getByRole('button', { name: 'Update Password' }).click();

    // Policy violation check in container
    const notifications = page.getByLabel('Notifications alt+T');
    await expect(notifications).toContainText('Password must be at least 8 characters');

    // Confirm passwords match check
    await page.getByLabel(/^New Password/).fill('AssetOpsNewPass2026!!!');
    await page.getByLabel('Confirm New Password').fill('Mismatch123!');
    await page.getByRole('button', { name: 'Update Password' }).click();
    await expect(notifications).toContainText('New passwords do not match');
  });
});
