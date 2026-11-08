import { expect, test } from "@playwright/test";

test.use({ storageState: "playwright/.auth/admin.json" });

test("Asset detail stays readable until Edit is requested", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/dashboard/applications");
  await page.getByRole("link", { name: "Treasury Registry" }).click();
  const asset = page.getByRole("link", { name: "app-prod-01 · DEV-ASSET-004" }).first();
  await expect(asset).toBeVisible({ timeout: 30_000 });
  await asset.click();
  await expect(page).toHaveURL(/\/dashboard\/assets\/[^/?]+$/, {
    timeout: 30_000,
  });
  await expect(
    page.getByRole("main").getByRole("heading", { name: "app-prod-01" }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Loading Asset Form...", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByRole("button", { name: "Edit Asset" }).click();
  await expect(
    page.getByRole("heading", { name: "Edit Asset Information" }),
  ).toBeVisible({ timeout: 30_000 });
});
