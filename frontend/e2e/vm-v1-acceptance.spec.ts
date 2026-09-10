import { test, expect } from "@playwright/test";

test.describe("VM V1.1 acceptance - progressive promotion and remediation", () => {
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

    await page.getByRole("button", { name: "Edit VM" }).click();
    const editDialog = page.getByRole("dialog", {
      name: "Edit Virtual Machine",
    });
    await expect(editDialog).toBeVisible();
    await editDialog.getByLabel("Owner").fill("platform-team");
    await editDialog.getByLabel("Business Unit").fill("Treasury");
    await editDialog.getByLabel("SLA Tier").fill("Tier-1");
    await editDialog.getByRole("combobox", { name: "Environment" }).click();
    await page.getByRole("option", { name: "PROD", exact: true }).click();
    await editDialog.getByRole("combobox", { name: "Service Role" }).click();
    await page.getByRole("option", { name: "Web Server", exact: true }).click();
    await editDialog
      .getByLabel("Business Purpose / Description")
      .fill("E2E curated production VM context");
    await editDialog.getByLabel("Tags").fill("e2e, curated");
    await editDialog.getByLabel("Username").fill("svc-e2e-curated");
    await editDialog.getByRole("textbox", { name: "Role", exact: true }).fill("OS Admin");
    await editDialog
      .getByRole("combobox", { name: "Primary Application Component" })
      .click();
    await page
      .getByRole("option", { name: /Treasury Registry · PROD ·/ })
      .first()
      .click();
    await editDialog.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("VM updated", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "CONTEXT", exact: true }).click();
    await expect(page.getByText("platform-team", { exact: true })).toBeVisible();
    await expect(page.getByText("Treasury", { exact: true })).toBeVisible();
    await expect(page.getByText("Tier-1", { exact: true })).toBeVisible();
    await expect(
      page.getByText("E2E curated production VM context", { exact: true }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Data Quality" }).click();
    await expect(page).toHaveURL(/\/dashboard\/data-quality$/);
    await expect(
      page.getByRole("link").filter({ hasText: "vm-e2e-needs-context" }),
    ).toHaveCount(0);
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
    const relationships = page
      .getByRole("heading", {
        name: "Application Relationships",
        exact: true,
      })
      .locator("..")
      .locator("..");
    await expect(
      relationships.getByText("Treasury Registry", { exact: true }),
    ).toHaveCount(2);
    await expect(
      relationships.getByRole("button", {
        name: /Treasury Registry.*Primary/,
      }),
    ).toHaveCount(1);
    await expect(
      relationships.getByRole("button", {
        name: /Treasury Registry.*Shared/,
      }),
    ).toHaveCount(1);
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
    const restoredRelationships = page
      .getByRole("heading", {
        name: "Application Relationships",
        exact: true,
      })
      .locator("..")
      .locator("..");
    await expect(
      restoredRelationships.getByText("Treasury Registry", { exact: true }),
    ).toHaveCount(2);
    await expect(
      restoredRelationships.getByRole("button", {
        name: /Treasury Registry.*Primary/,
      }),
    ).toHaveCount(1);
    await expect(
      restoredRelationships.getByRole("button", {
        name: /Treasury Registry.*Shared/,
      }),
    ).toHaveCount(1);
    await expect(page.getByText("svc_vm_e2e", { exact: true })).toBeVisible();

    await page.goto("/dashboard/audit-logs");
    const search = page.getByPlaceholder(
      "Search logs by user, action, or details...",
    );
    await search.fill("COPY_PASSWORD");
    const auditRow = page
      .getByRole("row")
      .filter({ hasText: "Copy Password" })
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
