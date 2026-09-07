import { test, expect } from "@playwright/test";

test.describe("VM V1 acceptance - progressive promotion", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  test("promotes an incomplete discovery into Inventory and keeps it actionable in Data Quality", async ({
    page,
  }) => {
    await page.goto(
      "/dashboard/virtual-machines?view=PENDING&q=vm-e2e-needs-context",
    );
    const row = page
      .getByRole("row")
      .filter({ hasText: "vm-e2e-needs-context" });
    await expect(
      row,
      "Prerequisite error: reseed the deterministic VM acceptance fixture first.",
    ).toBeVisible({ timeout: 10000 });
    await row.getByRole("button", { name: "Setup" }).click();

    const setupDialog = page.getByRole("dialog", { name: "Complete VM Setup" });
    await expect(setupDialog).toBeVisible();
    await expect(
      setupDialog.getByRole("textbox", { name: "VM Name" }),
    ).toHaveValue("vm-e2e-needs-context");
    await expect(
      setupDialog.getByRole("button", { name: "Promote to Inventory" }),
    ).toBeVisible();
    await setupDialog
      .getByRole("button", { name: "Promote to Inventory" })
      .click();
    await expect(
      page.getByText("VM promoted to active inventory"),
    ).toBeVisible();
    await expect(page).toHaveURL(
      /\/dashboard\/virtual-machines\/[a-zA-Z0-9-]+/,
    );

    await page.goto("/dashboard/data-quality");
    const issue = page
      .getByRole("link")
      .filter({ hasText: "vm-e2e-needs-context" });
    await expect(issue).toBeVisible();
    await expect(issue.getByText("owner", { exact: true })).toBeVisible();
    await expect(
      issue.getByText("application component", { exact: true }),
    ).toBeVisible();
  });
});

test.describe("VM V1 acceptance - relationships, credentials, archive/restore", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  test("preserves Primary/Shared relationships and credential behavior through archive/restore", async ({
    page,
  }) => {
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/dashboard/virtual-machines?view=ACTIVE&q=vm-prod-01");
    let row = page.getByRole("row").filter({ hasText: "vm-prod-01" });
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.getByRole("button", { name: "Details" }).click();

    await expect(
      page.getByText("Application Relationships", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Treasury Registry", { exact: true }),
    ).toHaveCount(2);
    await expect(page.getByText("Primary", { exact: true })).toBeVisible();
    await expect(page.getByText("Shared", { exact: true })).toBeVisible();
    await expect(page.getByText("svc_vm_e2e", { exact: true })).toBeVisible();

    const copy = page.getByRole("button", {
      name: "Copy password for svc_vm_e2e",
    });
    const copyAuditResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/vm/guest-accounts/") &&
        response.url().endsWith("/copy"),
    );
    await copy.click();
    expect((await copyAuditResponse).ok()).toBeTruthy();
    await expect(page.getByText("Password copied")).toBeVisible();

    await page.goto("/dashboard/virtual-machines?view=ACTIVE&q=vm-prod-01");
    row = page.getByRole("row").filter({ hasText: "vm-prod-01" });
    await row.getByRole("button", { name: "Archive" }).click();

    await page.goto("/dashboard/virtual-machines?view=ARCHIVED&q=vm-prod-01");
    row = page.getByRole("row").filter({ hasText: "vm-prod-01" });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Restore" }).click();

    await page.goto("/dashboard/virtual-machines?view=ACTIVE&q=vm-prod-01");
    row = page.getByRole("row").filter({ hasText: "vm-prod-01" });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Details" }).click();
    await expect(
      page.getByText("Treasury Registry", { exact: true }),
    ).toHaveCount(2);
    await expect(page.getByText("Primary", { exact: true })).toBeVisible();
    await expect(page.getByText("Shared", { exact: true })).toBeVisible();
    await expect(page.getByText("svc_vm_e2e", { exact: true })).toBeVisible();

    await page.goto("/dashboard/audit-logs");
    const search = page.getByPlaceholder(
      "Search logs by user, action, or details...",
    );
    await search.fill("COPY_PASSWORD");
    const auditRow = page
      .getByRole("row")
      .filter({ hasText: "COPY_PASSWORD" })
      .filter({ hasText: "svc_vm_e2e" })
      .first();
    await expect(auditRow).toBeVisible();
  });
});

test.describe("VM V1 acceptance - Viewer is read-only", () => {
  test.use({ storageState: "playwright/.auth/viewer.json" });

  test("hides vCenter and VM mutation controls including secret actions", async ({
    page,
  }) => {
    await page.goto("/dashboard/virtual-machines/sources");
    await expect(
      page.getByText("development-vcenter", { exact: true }),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "Add vCenter" })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: "Sync All Sources" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Sync development-vcenter" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Edit development-vcenter" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Archive development-vcenter" }),
    ).toHaveCount(0);

    await page.goto("/dashboard/virtual-machines?view=ACTIVE&q=vm-prod-01");
    const row = page.getByRole("row").filter({ hasText: "vm-prod-01" });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Details" }).click();
    await expect(page.getByRole("button", { name: "Edit VM" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Archive" })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Reveal password for svc_vm_e2e" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Copy password for svc_vm_e2e" }),
    ).toHaveCount(0);
  });
});
