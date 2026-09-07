import { test, expect } from "@playwright/test";

test.describe("Database V1 acceptance - progressive context", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  test("keeps an incomplete Instance visible as Needs Context without inventing values", async ({
    page,
  }) => {
    await page.goto("/dashboard/databases?q=db-e2e-needs-context");
    const row = page
      .getByRole("row")
      .filter({ hasText: "db-e2e-needs-context" });

    await expect(
      row,
      "Prerequisite error: reseed the deterministic Database acceptance fixture first.",
    ).toBeVisible({ timeout: 10000 });
    await expect(row.getByText("Needs Context", { exact: true })).toBeVisible();
    await expect(row.getByText("PostgreSQL", { exact: true })).toBeVisible();
  });
});

test.describe("Database V1 acceptance - topology, account scopes, credentials, lifecycle", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  test("preserves Logical Database relations and scoped accounts through archive/restore", async ({
    page,
  }) => {
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/dashboard/databases?q=Treasury%20Registry%20DB");
    let row = page.getByRole("row").filter({ hasText: "Treasury Registry DB" });
    await expect(row).toBeVisible({ timeout: 10000 });
    await row
      .getByRole("link", { name: "View details for Treasury Registry DB" })
      .click();

    await expect(page.getByText("registry", { exact: true })).toBeVisible();
    await expect(page.getByText("audit", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Treasury Registry", { exact: true }),
    ).toHaveCount(3);
    await expect(page.getByText("svc_registry", { exact: true })).toBeVisible();
    await expect(
      page.getByText("report_reader", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Whole Instance", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Logical Databases", { exact: true }),
    ).toBeVisible();

    const copyAuditResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/databases/") &&
        response.url().includes("/accounts/") &&
        response.url().endsWith("/copy"),
    );
    await page
      .getByRole("button", { name: "Copy password for svc_registry" })
      .click();
    expect((await copyAuditResponse).ok()).toBeTruthy();
    await expect(page.getByText("Copied password")).toBeVisible();

    const archiveLogicalResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "DELETE" &&
        response.url().includes("/logical-databases/"),
    );
    await page
      .getByRole("button", { name: "Archive logical database audit" })
      .click();
    expect((await archiveLogicalResponse).ok()).toBeTruthy();
    await expect(
      page.getByRole("button", { name: "Restore logical database audit" }),
    ).toBeVisible();

    const restoreLogicalResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/logical-databases/") &&
        response.url().endsWith("/restore"),
    );
    await page
      .getByRole("button", { name: "Restore logical database audit" })
      .click();
    expect((await restoreLogicalResponse).ok()).toBeTruthy();
    await expect(
      page.getByRole("button", { name: "Archive logical database audit" }),
    ).toBeVisible();

    await page.goto("/dashboard/databases?q=Treasury%20Registry%20DB");
    row = page.getByRole("row").filter({ hasText: "Treasury Registry DB" });
    await row.getByRole("button", { name: "Database Actions" }).click();
    await page.getByRole("menuitem", { name: "Archive Database" }).click();
    await page.getByRole("button", { name: "Confirm Archive" }).click();
    await expect(
      page.getByText("Database archived successfully"),
    ).toBeVisible();

    await page.getByRole("button", { name: "Archived Databases" }).click();
    row = page.getByRole("row").filter({ hasText: "Treasury Registry DB" });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Database Actions" }).click();
    await page.getByRole("menuitem", { name: "Restore Database" }).click();
    await page.getByRole("button", { name: "Confirm Restore" }).click();
    await expect(
      page.getByText("Database restored successfully"),
    ).toBeVisible();

    await page.goto("/dashboard/databases?q=Treasury%20Registry%20DB");
    row = page.getByRole("row").filter({ hasText: "Treasury Registry DB" });
    await row
      .getByRole("link", { name: "View details for Treasury Registry DB" })
      .click();
    await expect(page.getByText("registry", { exact: true })).toBeVisible();
    await expect(page.getByText("audit", { exact: true })).toBeVisible();
    await expect(page.getByText("svc_registry", { exact: true })).toBeVisible();
    await expect(
      page.getByText("report_reader", { exact: true }),
    ).toBeVisible();
  });
});

test.describe("Database V1 acceptance - Viewer is read-only", () => {
  test.use({ storageState: "playwright/.auth/viewer.json" });

  test("hides Database mutation and secret controls", async ({ page }) => {
    await page.goto("/dashboard/databases?q=Treasury%20Registry%20DB");
    const row = page
      .getByRole("row")
      .filter({ hasText: "Treasury Registry DB" });
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: "Add Database" }),
    ).toHaveCount(0);
    await expect(
      row.getByRole("button", { name: "Edit Database" }),
    ).toHaveCount(0);

    await row
      .getByRole("link", { name: "View details for Treasury Registry DB" })
      .click();
    await expect(
      page.getByRole("button", { name: "Reveal password for svc_registry" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Copy password for svc_registry" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Archive logical database registry" }),
    ).toHaveCount(0);
  });
});
