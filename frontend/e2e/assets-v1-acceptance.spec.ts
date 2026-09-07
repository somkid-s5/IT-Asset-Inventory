import { test, expect } from "@playwright/test";

test.describe("Asset V1 acceptance - operational journey", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  test("preserves explicit access accounts and Application relationships through archive and restore", async ({
    page,
  }) => {
    const suffix = Date.now();
    const assetName = `e2e-v1-asset-${suffix}`;
    const assetId = `E2E-V1-${suffix}`;
    const serial = `E2E-SN-${suffix}`;

    await page.goto("/dashboard/assets");
    await page.getByRole("button", { name: "Add Asset" }).click();

    await page.getByPlaceholder("Enter asset or host name").fill(assetName);
    await page
      .getByRole("textbox", { name: "Asset ID", exact: true })
      .fill(assetId);
    await page
      .getByRole("textbox", { name: "Serial Number", exact: true })
      .fill(serial);
    await page
      .getByRole("textbox", { name: "Owner", exact: true })
      .fill("e2e-platform-team");
    await page.getByPlaceholder("e.g. Data Center 1").fill("Bangkok E2E DC");

    await page
      .getByRole("combobox", { name: "Primary Application Component" })
      .click();
    await page
      .getByRole("option", { name: "Treasury Registry · PROD · Web" })
      .click();
    await page
      .getByRole("checkbox", { name: "Treasury Registry · PROD · API" })
      .click();

    const host = page.getByTestId("asset-access-point-1");
    await host.getByRole("combobox", { name: "Access point 1 type" }).click();
    await page.getByRole("option", { name: "Host", exact: true }).click();
    await host.getByRole("combobox", { name: "Access point 1 method" }).click();
    await page.getByRole("option", { name: "SSH", exact: true }).click();
    await host.getByLabel("Access point 1 IP address").fill("10.250.1.10");
    await host.getByLabel("Access point 1 version").fill("OpenSSH 9");
    await host.getByLabel("Access point 1 username 1").fill("e2e-host-admin");
    await host
      .getByLabel("Access point 1 password 1")
      .fill("E2E-Host-Admin-1!");
    await host.getByRole("button", { name: "Add User" }).click();
    await host.getByLabel("Access point 1 username 2").fill("e2e-host-ops");
    await host.getByLabel("Access point 1 password 2").fill("E2E-Host-Ops-2!");

    await page.getByRole("button", { name: "Add Row" }).click();
    const management = page.getByTestId("asset-access-point-2");
    await management
      .getByRole("combobox", { name: "Access point 2 type" })
      .click();
    await page.getByRole("option", { name: "Management", exact: true }).click();
    await management
      .getByRole("combobox", { name: "Access point 2 method" })
      .click();
    await page.getByRole("option", { name: "WEB", exact: true }).click();
    await management
      .getByLabel("Access point 2 IP address")
      .fill("10.250.1.11");
    await management.getByLabel("Access point 2 version").fill("iLO 6 1.60");
    await management
      .getByLabel("Access point 2 username 1")
      .fill("e2e-ilo-admin");
    await management
      .getByLabel("Access point 2 password 1")
      .fill("E2E-ILO-Admin-3!");

    await page.getByRole("button", { name: "Create Asset" }).click();
    await expect(page.getByText("Asset created successfully")).toBeVisible();

    await page.getByPlaceholder("Search assets...").fill(assetName);
    let row = page.getByRole("row").filter({ hasText: assetName });
    await expect(row).toBeVisible();
    await row.click();

    await expect(page.getByRole("heading", { name: assetName })).toBeVisible();
    const relationships = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Application Relationships" }),
    });
    await expect(relationships).toBeVisible();
    await expect(
      relationships.getByText("Treasury Registry", { exact: true }),
    ).toHaveCount(2);
    await expect(relationships.getByText("Primary", { exact: true })).toBeVisible();
    await expect(relationships.getByText("Shared", { exact: true })).toBeVisible();

    const hostAccordion = page.getByRole("button", { name: /10\.250\.1\.10/ });
    await expect(hostAccordion).toBeVisible();
    if ((await hostAccordion.getAttribute("aria-expanded")) !== "true") {
      await hostAccordion.click();
    }
    await expect(
      page.getByText("e2e-host-admin", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("e2e-host-ops", { exact: true })).toBeVisible();

    const managementAccordion = page.getByRole("button", {
      name: /10\.250\.1\.11/,
    });
    await managementAccordion.click();
    await expect(
      page.getByText("e2e-ilo-admin", { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Back to Assets" }).click();
    await page.getByPlaceholder("Search assets...").fill(assetName);
    row = page.getByRole("row").filter({ hasText: assetName });
    await row.getByRole("button", { name: "Asset Actions" }).click();
    await page.getByRole("menuitem", { name: "Archive Asset" }).click();
    await page.getByRole("button", { name: "Confirm Archive" }).click();
    await expect(page.getByText("Asset archived successfully")).toBeVisible();

    await page.getByRole("button", { name: "Archived Assets" }).click();
    await page.getByPlaceholder("Search assets...").fill(assetName);
    row = page.getByRole("row").filter({ hasText: assetName });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Asset Actions" }).click();
    await page.getByRole("menuitem", { name: "Restore Asset" }).click();
    await page.getByRole("button", { name: "Confirm Restore" }).click();
    await expect(page.getByText("Asset restored successfully")).toBeVisible();

    await page.getByRole("button", { name: "Active Assets" }).click();
    await page.getByPlaceholder("Search assets...").fill(assetName);
    row = page.getByRole("row").filter({ hasText: assetName });
    await expect(row).toBeVisible();
    await row.click();

    await expect(
      relationships.getByText("Treasury Registry", { exact: true }),
    ).toHaveCount(2);
    await expect(relationships.getByText("Primary", { exact: true })).toBeVisible();
    await expect(relationships.getByText("Shared", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /10\.250\.1\.10/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /10\.250\.1\.11/ }),
    ).toBeVisible();

    // Leave the generated record archived so repeated acceptance runs do not pollute active inventory.
    await page.getByRole("button", { name: "Back to Assets" }).click();
    await page.getByPlaceholder("Search assets...").fill(assetName);
    row = page.getByRole("row").filter({ hasText: assetName });
    await row.getByRole("button", { name: "Asset Actions" }).click();
    await page.getByRole("menuitem", { name: "Archive Asset" }).click();
    await page.getByRole("button", { name: "Confirm Archive" }).click();
    await expect(page.getByText("Asset archived successfully")).toBeVisible();
  });
});

test.describe("Asset V1 acceptance - Viewer credential restriction", () => {
  test.use({ storageState: "playwright/.auth/viewer.json" });

  test("Viewer receives 403 when attempting to reveal a credential", async ({
    page,
  }) => {
    await page.goto("/dashboard/assets?q=db-prod-01");
    const row = page.getByRole("row").filter({ hasText: "db-prod-01" });
    await expect(row).toBeVisible();
    await row.click();

    const reveal = page.getByRole("button", {
      name: "Reveal password for postgres_admin",
    });
    await expect(reveal).toBeVisible();
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/credentials/") &&
        response.url().endsWith("/reveal"),
    );
    await reveal.click();
    const response = await responsePromise;
    expect(response.status()).toBe(403);
  });
});

test.describe("Asset V1 acceptance - credential copy audit", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  test("Admin copy retrieves the secret through reveal and records COPY_PASSWORD", async ({
    page,
  }) => {
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/dashboard/assets?q=db-prod-01");
    const row = page.getByRole("row").filter({ hasText: "db-prod-01" });
    await expect(row).toBeVisible();
    await row.click();

    const copy = page.getByRole("button", {
      name: "Copy password for postgres_admin",
    });
    await expect(copy).toBeVisible();

    const copyAuditResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/credentials/") &&
        response.url().endsWith("/copy"),
    );
    await copy.click();
    expect((await copyAuditResponse).ok()).toBeTruthy();
    await expect(page.getByText("Password copied")).toBeVisible();

    await page.goto("/dashboard/audit-logs");
    const search = page.getByPlaceholder(
      "Search logs by user, action, or details...",
    );
    await search.fill("COPY_PASSWORD");
    const auditRow = page
      .getByRole("row")
      .filter({ hasText: "COPY_PASSWORD" })
      .first();
    await expect(auditRow).toBeVisible();
    await expect(auditRow).toContainText("postgres_admin");
  });
});
