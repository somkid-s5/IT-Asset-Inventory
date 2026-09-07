import { expect, test } from "@playwright/test";

const emptySearchResponse = {
  applications: [],
  assets: [],
  virtualMachines: [],
  databases: [],
  logicalDatabases: [],
  documents: [],
};

test.describe("Global Search V1 acceptance - desktop", () => {
  test.use({
    storageState: "playwright/.auth/admin.json",
    viewport: { width: 1440, height: 900 },
  });

  test("opens with Ctrl+K and preserves backend matches for Asset ID, serial, IP, and Logical Database", async ({
    page,
  }) => {
    await page.goto("/dashboard/applications");
    await page.keyboard.press("Control+K");

    let dialog = page.getByRole("dialog");
    const input = dialog.getByRole("combobox", { name: "Search inventory" });
    await expect(input).toBeFocused();

    await input.fill("DEV-ASSET-001");
    await expect(dialog.getByText("Assets", { exact: true })).toBeVisible();
    await expect(dialog.getByText("db-prod-01", { exact: true })).toBeVisible();

    await input.fill("E2E-SN-001");
    await expect(dialog.getByText("db-prod-01", { exact: true })).toBeVisible();

    await input.fill("10.0.1.45");
    await expect(dialog.getByText("db-prod-01", { exact: true })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);

    await page.getByRole("button", { name: "Open global search" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("combobox", { name: "Search inventory" }).fill("registry");
    const logicalDatabases = dialog.getByRole("group", {
      name: "Logical Databases",
    });
    await expect(logicalDatabases).toBeVisible();
    await expect(
      logicalDatabases.getByText("registry", { exact: true }),
    ).toBeVisible();
    await expect(
      logicalDatabases.getByText("Treasury Registry DB · Oracle", { exact: true }).last(),
    ).toBeVisible();

    await logicalDatabases.getByText("registry", { exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/dashboard\/databases\/[a-zA-Z0-9-]+/);
  });

  test("distinguishes loading, request failure, retry, and valid no-result states", async ({
    page,
  }) => {
    let failSearch = true;
    await page.route("**/api/search**", async (route) => {
      const url = new URL(route.request().url());
      const query = url.searchParams.get("q");

      if (query === "slow-query") {
        await new Promise((resolve) => setTimeout(resolve, 300));
        await route.fulfill({ status: 200, json: emptySearchResponse });
        return;
      }

      if (query === "fail-query" && failSearch) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "forced search failure" }),
        });
        return;
      }

      await route.fulfill({ status: 200, json: emptySearchResponse });
    });

    await page.goto("/dashboard/assets");
    await page.keyboard.press("Control+K");
    const dialog = page.getByRole("dialog");
    const input = dialog.getByRole("combobox", { name: "Search inventory" });

    await input.fill("slow-query");
    await expect(dialog.getByRole("status")).toContainText(
      "Searching inventory",
    );
    await expect(
      dialog.getByText("No matching inventory records.", { exact: true }),
    ).toBeVisible();

    await input.fill("fail-query");
    await expect(dialog.getByRole("alert")).toContainText("Search unavailable", {
      timeout: 12000,
    });
    failSearch = false;
    await dialog.getByRole("button", { name: "Retry search" }).click();
    await expect(
      dialog.getByText("No matching inventory records.", { exact: true }),
    ).toBeVisible();
  });
});

test.describe("Global Search V1 acceptance - tablet", () => {
  test.use({
    storageState: "playwright/.auth/admin.json",
    viewport: { width: 820, height: 1180 },
  });

  test("opens from the topbar pointer entry and navigates to a VM", async ({
    page,
  }) => {
    await page.goto("/dashboard/databases");
    await page.getByRole("button", { name: "Open global search" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("combobox", { name: "Search inventory" }).fill("vm-prod-01");
    await expect(
      dialog.getByText("Virtual Machines", { exact: true }),
    ).toBeVisible();
    await dialog.getByText("vm-prod-01", { exact: true }).click();
    await expect(page).toHaveURL(
      /\/dashboard\/virtual-machines\/[a-zA-Z0-9-]+/,
    );
  });
});

test.describe("Global Search V1 acceptance - mobile", () => {
  test.use({
    storageState: "playwright/.auth/admin.json",
    viewport: { width: 390, height: 844 },
  });

  test("uses the compact topbar entry, focuses the query, stays in viewport, and navigates", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Open global search" }).click();
    const dialog = page.getByRole("dialog");
    const input = dialog.getByRole("combobox", { name: "Search inventory" });
    await expect(input).toBeFocused();

    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);

    await input.fill("Treasury Registry");
    const applicationGroup = dialog
      .locator("[cmdk-group]")
      .filter({ hasText: "Applications" });
    await applicationGroup
      .getByText("Treasury Registry", { exact: true })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/applications\/[a-zA-Z0-9-]+/);
  });
});
