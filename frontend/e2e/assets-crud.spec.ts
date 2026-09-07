import { test, expect } from "@playwright/test";

test.describe("Assets CRUD Operations", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/assets");
    await expect(page.getByRole("button", { name: "Add Asset" })).toBeVisible({
      timeout: 10000,
    });
  });

  test("should create, edit, and archive an asset successfully", async ({
    page,
  }) => {
    const assetName = `E2E Test Switch - ${Date.now()}`;
    const modifiedName = `${assetName} Modified`;

    // 1. Create Asset with validation check
    await page.getByRole("button", { name: "Add Asset" }).click();

    // Submit blank form to trigger validation
    await page.getByRole("button", { name: "Create Asset" }).click();
    await expect(page.getByText("Asset name is required")).toBeVisible();

    for (const label of [
      "Owner",
      "Department",
      "Responsible Party",
      "Vendor",
      "Total Sockets",
      "Installed Capacity (Total)",
      "Raw Capacity (Total)",
      "Rated Power (Total)",
      "Total Ports",
      "Slot Type",
      "Total Units",
      "Rack Units",
      "RAID Level",
    ]) {
      await expect(
        page.getByRole("textbox", { name: label, exact: true }),
      ).toBeVisible();
    }

    // Fill form and submit
    await page.getByPlaceholder("Enter asset or host name").fill(assetName);

    // Select Switch type
    await page
      .getByRole("combobox", { name: "Type", exact: true })
      .click();
    await page.getByRole("option", { name: "Switch", exact: true }).click();

    await page.getByPlaceholder("e.g. Rack A1").fill("Rack-99");
    await page.getByPlaceholder("e.g. Data Center 1").fill("Main DC");
    await page.getByLabel("Total Sockets", { exact: true }).fill("2");
    await page
      .getByLabel("Installed Capacity (Total)", { exact: true })
      .fill("256 GB");
    await page
      .getByLabel("Raw Capacity (Total)", { exact: true })
      .fill("15.36 TB");
    await page
      .getByLabel("Rated Power (Total)", { exact: true })
      .fill("1,600W");
    await page.getByRole("button", { name: "Create Asset" }).click();

    await expect(page.getByText("Asset created successfully")).toBeVisible({
      timeout: 5000,
    });

    let row = page.getByRole("row").filter({ hasText: assetName });
    await expect(row).toBeVisible();

    // Verify the incomplete record is actionable from Data Quality before fixing governance context.
    await page.goto("/dashboard/data-quality");
    const qualityIssueBefore = page
      .getByRole("link")
      .filter({ hasText: assetName });
    await expect(qualityIssueBefore).toBeVisible();
    await expect(
      qualityIssueBefore.getByText("owner", { exact: true }),
    ).toBeVisible();

    await page.goto("/dashboard/assets");
    await page.getByPlaceholder("Search assets...").fill(assetName);
    row = page.getByRole("row").filter({ hasText: assetName });
    await expect(row).toBeVisible();

    // 2. Edit Asset
    const editBtn = row.getByRole("button", { name: "Edit Asset" });
    await editBtn.click();

    await expect(
      page.getByLabel("Installed Capacity (Total)", { exact: true }),
    ).toHaveValue("256 GB");
    await expect(
      page.getByLabel("Raw Capacity (Total)", { exact: true }),
    ).toHaveValue("15.36 TB");
    await page.getByPlaceholder("Enter asset or host name").fill(modifiedName);
    await page
      .getByRole("textbox", { name: "Owner", exact: true })
      .fill("E2E Governance Owner");
    await page
      .getByRole("textbox", { name: "Responsible Party", exact: true })
      .fill("E2E Operations Team");
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(page.getByText("Asset updated successfully")).toBeVisible();

    const modifiedRow = page.getByRole("row").filter({ hasText: modifiedName });
    await expect(modifiedRow).toBeVisible();

    await modifiedRow.click();
    await expect(page).toHaveURL(/\/dashboard\/assets\/[^/]+$/);
    await expect(
      page.getByRole("heading", { name: modifiedName }),
    ).toBeVisible();
    await expect(
      page.getByText("E2E Governance Owner", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("E2E Operations Team", { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Back to Assets" }).click();
    await expect(page).toHaveURL(/\/dashboard\/assets$/);
    await expect(
      page.getByRole("row").filter({ hasText: modifiedName }),
    ).toBeVisible();

    // Data Quality may still list this progressive record for other missing context,
    // but the owner issue must be resolved by the normal Asset edit journey.
    await page.goto("/dashboard/data-quality");
    const qualityIssueAfter = page
      .getByRole("link")
      .filter({ hasText: modifiedName });
    await expect(qualityIssueAfter).toBeVisible();
    await expect(
      qualityIssueAfter.getByText("owner", { exact: true }),
    ).toHaveCount(0);

    await page.goto("/dashboard/assets");
    const filteredAssetsResponse = page.waitForResponse((response) => {
      if (!response.url().includes("/api/assets")) return false;
      const url = new URL(response.url());
      return url.searchParams.get("q") === modifiedName && response.ok();
    });
    await page.getByPlaceholder("Search assets...").fill(modifiedName);
    await filteredAssetsResponse;
    await expect(modifiedRow).toBeVisible();

    // 3. Archive Asset
    const menuBtn = modifiedRow.getByRole("button", { name: "Asset Actions" });
    await menuBtn.click();

    await page.getByRole("menuitem", { name: "Archive Asset" }).click();

    const confirmBtn = page.getByRole("button", { name: "Confirm Archive" });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    await expect(page.getByText("Asset archived successfully")).toBeVisible();
    await expect(modifiedRow).not.toBeVisible();
  });

  test("should search and persist a parent outside the current table page", async ({
    page,
  }) => {
    await page.getByRole("combobox").selectOption("5");
    await expect(page.getByRole("table")).not.toContainText("switch-edge-01");

    await page.getByPlaceholder("Search assets...").fill("db-prod-01");
    const childRow = page.getByRole("row").filter({ hasText: "db-prod-01" });
    await expect(childRow).toBeVisible();
    await childRow.getByRole("button", { name: "Edit Asset" }).click();

    await page.getByRole("combobox", { name: "Parent Asset" }).click();
    await page
      .getByRole("combobox", { name: "Search parent assets" })
      .fill("switch-edge-01");
    const parentOption = page
      .getByRole("option")
      .filter({ hasText: "switch-edge-01" });
    await expect(parentOption).toBeVisible();
    await parentOption.click();
    await expect(
      page.getByRole("combobox", { name: "Parent Asset" }),
    ).toContainText("switch-edge-01");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Asset updated successfully")).toBeVisible();

    await expect(childRow).toBeVisible();
    await childRow.click();
    await expect(
      page.getByRole("heading", { name: "db-prod-01" }),
    ).toBeVisible();
    const parentLink = page.getByRole("button", { name: /switch-edge-01/i });
    await expect(parentLink).toBeVisible();
    await parentLink.click();
    await expect(
      page.getByRole("heading", { name: "switch-edge-01" }),
    ).toBeVisible();

    // Cleanup the seeded child so this test remains repeatable.
    await page.goto("/dashboard/assets?q=db-prod-01");
    const cleanupRow = page.getByRole("row").filter({ hasText: "db-prod-01" });
    await expect(cleanupRow).toBeVisible();
    await cleanupRow.getByRole("button", { name: "Edit Asset" }).click();
    await page.getByRole("combobox", { name: "Parent Asset" }).click();
    await page.getByRole("option", { name: "No Parent (Standalone)" }).click();
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Asset updated successfully")).toBeVisible();
  });
});
