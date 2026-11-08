import { expect, test } from "@playwright/test";
for (const role of ["admin", "viewer"] as const) {
  test.describe(`${role} relationship navigation`, () => {
    test.use({ storageState: `playwright/.auth/${role}.json` });
    test(`${role} can identify and open a component's compute records`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await page.goto("/dashboard/applications");
      await page.getByRole("link", { name: "Treasury Registry" }).click();

      const component = page.getByRole("listitem").filter({
        hasText: "Primary web tier for the deterministic acceptance fixture.",
      });
      await expect(
        component.getByRole("link", { name: "app-prod-01 · DEV-ASSET-004" }),
      ).toBeVisible({ timeout: 30_000 });
      await expect(
        component.getByRole("link", { name: "vm-prod-01" }),
      ).toBeVisible();
      await expect(
        component.getByRole("link", {
          name: /vm-e2e-deleted-in-vcenter.*Deleted in vCenter/,
        }),
      ).toBeVisible();
      await component
        .getByRole("link", { name: "app-prod-01 · DEV-ASSET-004" })
        .click();
      await expect(page).toHaveURL(/\/dashboard\/assets\/[^/]+$/, {
        timeout: 30_000,
      });
      const applicationFromAsset = page.getByRole("button", {
        name: /Treasury Registry.*PROD.*Web/,
      });
      await expect(applicationFromAsset).toBeVisible({ timeout: 30_000 });
      await applicationFromAsset.click();
      await expect(page).toHaveURL(/\/dashboard\/applications\/[^/?]+$/, {
        timeout: 30_000,
      });

      const returnedComponent = page.getByRole("listitem").filter({
        hasText: "Primary web tier for the deterministic acceptance fixture.",
      });
      await returnedComponent
        .getByRole("link", { name: "vm-prod-01" })
        .click();
      await expect(page).toHaveURL(/\/dashboard\/virtual-machines\/[^/]+$/, {
        timeout: 30_000,
      });
      await expect(page.getByText("vm-prod-01").first()).toBeVisible();

      const applicationFromVm = page.getByRole("button", {
        name: /Treasury Registry.*PROD.*Web/,
      });
      await expect(applicationFromVm).toBeVisible({ timeout: 30_000 });
      await applicationFromVm.click();
      await expect(page).toHaveURL(/\/dashboard\/applications\/[^/?]+$/, {
        timeout: 30_000,
      });

      const returnedWebComponent = page.getByRole("listitem").filter({
        hasText: "Primary web tier for the deterministic acceptance fixture.",
      });
      const logicalDatabase = returnedWebComponent.getByRole("link", {
        name: /Treasury Registry DB.*registry/,
      });
      await expect(logicalDatabase).toBeVisible({ timeout: 30_000 });
      await logicalDatabase.click();
      await expect(page).toHaveURL(/\/dashboard\/databases\/[a-zA-Z0-9-]+#logical-database-[a-zA-Z0-9-]+$/, { timeout: 30_000 });
      await expect(
        page.getByRole("heading", { name: "Treasury Registry DB" }),
      ).toBeVisible({ timeout: 30_000 });
      await expect(
        page.getByRole("article", { name: "Logical database registry" }),
      ).toBeVisible({ timeout: 30_000 });

      const applicationFromDatabase = page.getByRole("button", {
        name: /Treasury Registry.*PROD.*Web/,
      });
      await expect(applicationFromDatabase).toBeVisible({ timeout: 30_000 });
      await applicationFromDatabase.click();
      await expect(page).toHaveURL(/\/dashboard\/applications\/[^/?]+$/, {
        timeout: 30_000,
      });
      const apiComponent = page.getByRole("listitem").filter({
        hasText: "Shared API tier for the deterministic acceptance fixture.",
      });
      await apiComponent
        .getByRole("link", { name: /Treasury Registry DB.*audit/ })
        .click();
      await expect(page).toHaveURL(/\/dashboard\/databases\/[a-zA-Z0-9-]+#logical-database-[a-zA-Z0-9-]+$/, { timeout: 30_000 });
      await expect(
        page.getByRole("article", { name: "Logical database audit" }),
      ).toBeVisible({ timeout: 30_000 });
    });
  });
}

test.describe("mobile operational summaries", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  test("keeps Application, VM, and Database context readable at phone width", async ({ page }) => {
    test.setTimeout(90_000);
    const applicationsResponse = await page.request.get("/api/applications");
    if (!applicationsResponse.ok()) {
      throw new Error("Could not load Application relationship summary data");
    }
    const applications = (await applicationsResponse.json()) as Array<{
      name: string;
      environments: Array<{
        components: Array<{
          assets?: Array<{ id: string }>;
          virtualMachines?: Array<{ id: string }>;
          logicalDatabases?: Array<{ id: string }>;
        }>;
      }>;
    }>;
    const treasuryRegistry = applications.find(
      (application) => application.name === "Treasury Registry",
    );
    if (!treasuryRegistry) {
      throw new Error("Treasury Registry Application fixture is missing");
    }
    const linkedRecordIds = new Set<string>();
    for (const environment of treasuryRegistry.environments) {
      for (const component of environment.components) {
        component.assets?.forEach((asset) => linkedRecordIds.add(`asset:${asset.id}`));
        component.virtualMachines?.forEach((vm) => linkedRecordIds.add(`vm:${vm.id}`));
        component.logicalDatabases?.forEach((database) =>
          linkedRecordIds.add(`logical-database:${database.id}`),
        );
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/applications");

    await expect(
      page.getByRole("heading", { name: "Application registry", exact: true }),
    ).toHaveCount(1);
    const applicationCard = page.getByRole("article", {
      name: "Application Treasury Registry",
    });
    await expect(applicationCard).toBeVisible();
    await expect(applicationCard.getByText("Application Operations")).toBeVisible();
    await expect(applicationCard.getByText("PROD", { exact: true })).toBeVisible();
    await expect(applicationCard.getByText("Linked records")).toBeVisible();
    await expect(applicationCard).toHaveText(
      new RegExp(`Linked records\\s*${linkedRecordIds.size}`),
    );

    await page.getByRole("link", { name: "Treasury Registry" }).click();
    const component = page.getByRole("listitem").filter({
      hasText: "Primary web tier for the deterministic acceptance fixture.",
    });
    const vmLink = component.getByRole("link", { name: "vm-prod-01" });
    await expect(vmLink).toBeVisible({ timeout: 30_000 });
    await vmLink.click();
    const vmAccount = page.getByRole("article", {
      name: "Guest OS account svc_vm_e2e",
    });
    await expect(vmAccount).toBeVisible({ timeout: 30_000 });
    await expect(vmAccount.getByText("SSH", { exact: true })).toBeVisible();
    await expect(vmAccount.getByText("service", { exact: true })).toBeVisible();

    await page
      .getByRole("button", { name: /Treasury Registry.*PROD.*Web/ })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/applications\/[^/?]+$/, {
      timeout: 30_000,
    });
    const returnedComponent = page.getByRole("listitem").filter({
      hasText: "Primary web tier for the deterministic acceptance fixture.",
    });
    await returnedComponent
      .getByRole("link", { name: /Treasury Registry DB.*registry/ })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/databases\/[^/?]+$/, {
      timeout: 30_000,
    });
    const databaseAccount = page.getByRole("article", {
      name: "Database account svc_registry",
    });
    await expect(databaseAccount).toBeVisible({ timeout: 30_000 });
    await expect(databaseAccount.getByText("Whole instance")).toBeVisible();
    await expect(databaseAccount.getByText("SELECT", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: /Treasury Registry.*PROD.*Web/ })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/applications\/[^/?]+$/, {
      timeout: 30_000,
    });
  });
});

test.describe("mobile Application access summary", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  test("shows one environment-owned primary URL as an actionable link", async ({ page }) => {
    test.setTimeout(90_000);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const appName = `Access summary ${suffix}`;
    const address = `https://ops.example.test/${suffix}`;
    const response = await page.request.post("/api/applications", {
      data: {
        name: appName,
        environments: [
          {
            name: "PROD",
            noDatabase: true,
            components: [{ name: "Web" }],
          },
          {
            name: "UAT",
            noDatabase: true,
            components: [{ name: "Web" }],
            access: [
              {
                label: "Operations console",
                address,
                method: "HTTPS",
                isPrimary: true,
              },
            ],
          },
        ],
      },
    });
    if (!response.ok()) {
      throw new Error(`Application creation failed: ${response.status()}`);
    }
    const application = (await response.json()) as { id: string };

    try {
      await page.goto("/dashboard/applications");
      const desktopRow = page.getByRole("row").filter({ hasText: appName });
      await expect(desktopRow).toBeVisible({ timeout: 30_000 });
      await expect(desktopRow).toHaveText(/Primary access\s*·\s*UAT/);
      await expect(
        desktopRow.getByRole("link", { name: address, exact: true }),
      ).toBeVisible();

      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/dashboard/applications");
      const card = page.getByRole("article", {
        name: `Application ${appName}`,
      });
      await expect(card).toBeVisible({ timeout: 30_000 });
      await expect(card).toHaveText(/Access points\s*1/);
      await expect(card.getByText("Primary access · UAT", { exact: true })).toBeVisible();
      const primaryAccessLink = card.getByRole("link", {
        name: address,
        exact: true,
      });
      await page.screenshot({
        path: "output/application-audit/12-mobile-access-summary.png",
        fullPage: true,
      });
      const accessRoute = async (route: import("@playwright/test").Route) =>
        route.fulfill({ status: 200, contentType: "text/plain", body: "OK" });
      await page.context().route(address, accessRoute);
      try {
        const accessWindow = page.waitForEvent("popup");
        await primaryAccessLink.click();
        const accessPage = await accessWindow;
        await expect(accessPage).toHaveURL(address);
        await accessPage.close();
      } finally {
        await page.context().unroute(address, accessRoute);
      }
    } finally {
      const archive = await page.request.patch(
        `/api/applications/${application.id}/archive`,
      );
      if (!archive.ok()) {
        throw new Error(`Application cleanup failed: ${archive.status()}`);
      }
    }
  });
});

test.describe("asset relationship context", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  test("labels primary and shared Asset relationships with their responsible party", async ({ page }) => {
    test.setTimeout(90_000);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const primaryApplicationName = `Primary relationship ${suffix}`;
    const sharedApplicationName = `Shared relationship ${suffix}`;
    const primaryComponentName = `Primary Web ${suffix}`;
    const sharedComponentName = `Shared API ${suffix}`;
    const assetName = `Shared operations host ${suffix}`;
    const responsibleParty = `Shared Infrastructure ${suffix}`;
    let primaryApplicationId: string | undefined;
    let sharedApplicationId: string | undefined;
    let assetId: string | undefined;

    try {
      const primaryResponse = await page.request.post("/api/applications", {
        data: {
          name: primaryApplicationName,
          environments: [
            {
              name: "PROD",
              noDatabase: true,
              components: [{ name: primaryComponentName }],
            },
          ],
        },
      });
      if (!primaryResponse.ok()) {
        throw new Error(`Primary Application setup failed: ${primaryResponse.status()}`);
      }
      const primaryApplication = (await primaryResponse.json()) as {
        id: string;
        environments: Array<{ components: Array<{ id: string }> }>;
      };
      primaryApplicationId = primaryApplication.id;
      const primaryComponentId = primaryApplication.environments[0]?.components[0]?.id;
      if (!primaryComponentId) throw new Error("Primary Component setup failed.");

      const sharedResponse = await page.request.post("/api/applications", {
        data: {
          name: sharedApplicationName,
          environments: [
            {
              name: "PROD",
              noDatabase: true,
              components: [{ name: sharedComponentName }],
            },
          ],
        },
      });
      if (!sharedResponse.ok()) {
        throw new Error(`Shared Application setup failed: ${sharedResponse.status()}`);
      }
      const sharedApplication = (await sharedResponse.json()) as {
        id: string;
        environments: Array<{ components: Array<{ id: string }> }>;
      };
      sharedApplicationId = sharedApplication.id;
      const sharedComponentId = sharedApplication.environments[0]?.components[0]?.id;
      if (!sharedComponentId) throw new Error("Shared Component setup failed.");

      const assetResponse = await page.request.post("/api/assets", {
        data: {
          name: assetName,
          assetId: `E2E-RELATION-${suffix}`,
          type: "SERVER",
          componentLinks: [
            {
              componentId: primaryComponentId,
              relationType: "PRIMARY",
              responsibleParty: "Primary Operations",
            },
            {
              componentId: sharedComponentId,
              relationType: "SHARED",
              responsibleParty,
            },
          ],
        },
      });
      if (!assetResponse.ok()) {
        throw new Error(`Asset relationship setup failed: ${assetResponse.status()}`);
      }
      assetId = ((await assetResponse.json()) as { id: string }).id;

      await page.goto(`/dashboard/applications/${primaryApplicationId}`);
      const primaryComponent = page.getByRole("listitem").filter({
        hasText: primaryComponentName,
      });
      const primaryAsset = primaryComponent.getByRole("link", {
        name: new RegExp(`${assetName}.*Primary`),
      });
      await expect(primaryAsset).toBeVisible({ timeout: 30_000 });
      await expect(primaryAsset).toHaveText(/Responsible: Primary Operations/);

      await page.goto(`/dashboard/applications/${sharedApplicationId}`);
      const sharedComponent = page.getByRole("listitem").filter({
        hasText: sharedComponentName,
      });
      const sharedAsset = sharedComponent.getByRole("link", {
        name: new RegExp(`${assetName}.*Shared`),
      });
      await expect(sharedAsset).toBeVisible({ timeout: 30_000 });
      await expect(sharedAsset).toHaveText(
        new RegExp(`Responsible: ${responsibleParty}`),
      );
      await page.screenshot({
        path: "output/application-audit/11-shared-asset-responsibility.png",
        fullPage: true,
      });
    } finally {
      if (assetId) {
        const response = await page.request.patch(`/api/assets/${assetId}/archive`);
        if (!response.ok()) throw new Error("Asset relationship cleanup failed.");
      }
      for (const applicationId of [primaryApplicationId, sharedApplicationId]) {
        if (!applicationId) continue;
        const response = await page.request.patch(
          `/api/applications/${applicationId}/archive`,
        );
        if (!response.ok()) throw new Error("Application relationship cleanup failed.");
      }
    }
  });
});

test.describe("archived component asset", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  test("shows its lifecycle to administrators and viewers", async ({ page, browser }) => {
    test.setTimeout(90_000);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const assetName = `Archived relationship ${suffix}`;
    const assetResponse = await page.request.post("/api/assets", {
      data: { name: assetName, assetId: `E2E-${suffix}`, type: "SERVER" },
    });
    if (!assetResponse.ok()) throw new Error(`Asset creation failed: ${assetResponse.status()}`);
    const asset = await assetResponse.json() as { id: string };
    let applicationId: string | undefined;
    try {
      const appResponse = await page.request.post("/api/applications", {
        data: {
          name: `Relationship audit ${suffix}`,
          environments: [{ name: "PROD", components: [{ name: "Web", assetIds: [asset.id] }] }],
        },
      });
      if (!appResponse.ok()) throw new Error(`Application creation failed: ${appResponse.status()}`);
      const app = await appResponse.json() as { id: string };
      applicationId = app.id;
      const archive = await page.request.patch(`/api/assets/${asset.id}/archive`);
      if (!archive.ok()) throw new Error(`Asset archive failed: ${archive.status()}`);
      await page.goto(`/dashboard/applications/${app.id}`);
      await expect(page.getByRole("link", { name: new RegExp(`${assetName}.*Archived`) })).toBeVisible();
      const viewer = await browser.newContext({ storageState: "playwright/.auth/viewer.json" });
      try {
        const viewerPage = await viewer.newPage();
        await viewerPage.goto(page.url());
        await expect(viewerPage.getByRole("link", { name: new RegExp(`${assetName}.*Archived`) })).toBeVisible();
      } finally {
        await viewer.close();
      }
    } finally {
      if (applicationId) {
        const archiveApp = await page.request.patch(`/api/applications/${applicationId}/archive`);
        if (!archiveApp.ok()) throw new Error(`Application cleanup failed: ${archiveApp.status()}`);
      }
      const archiveAsset = await page.request.patch(`/api/assets/${asset.id}/archive`);
      if (!archiveAsset.ok()) throw new Error(`Asset cleanup failed: ${archiveAsset.status()}`);
    }
  });
});

test.describe("viewer secret controls", () => {
  test.use({ storageState: "playwright/.auth/viewer.json" });

  test("shows linked account context without password reveal controls", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/applications");
    await page.getByRole("link", { name: "Treasury Registry" }).click();

    const component = page.getByRole("listitem").filter({
      hasText: "Primary web tier for the deterministic acceptance fixture.",
    });
    const vmLink = component.getByRole("link", { name: "vm-prod-01" });
    await vmLink.click();
    await expect(page).toHaveURL(/\/dashboard\/virtual-machines\/[^/?]+$/, {
      timeout: 30_000,
    });
    await expect(
      page.getByRole("article", { name: "Guest OS account svc_vm_e2e" }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("button", {
        name: "Reveal password for svc_vm_e2e",
      }),
    ).toHaveCount(0);
    await page.screenshot({
      path: "output/application-audit/13-viewer-vm-credentials.png",
      fullPage: true,
    });

    await page
      .getByRole("button", { name: /Treasury Registry.*PROD.*Web/ })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/applications\/[^/?]+$/, {
      timeout: 30_000,
    });
    const returnedComponent = page.getByRole("listitem").filter({
      hasText: "Primary web tier for the deterministic acceptance fixture.",
    });
    await returnedComponent
      .getByRole("link", { name: /Treasury Registry DB.*registry/ })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/databases\/[^/?]+$/, {
      timeout: 30_000,
    });
    await expect(
      page.getByRole("article", { name: "Database account svc_registry" }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("button", {
        name: "Reveal password for svc_registry",
      }),
    ).toHaveCount(0);
    await page.screenshot({
      path: "output/application-audit/14-viewer-database-credentials.png",
      fullPage: true,
    });
  });
});

test.describe("VM credential reveal audit", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  test("requests a fresh audited reveal after the password is hidden", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/applications");
    await page.getByRole("link", { name: "Treasury Registry" }).click();
    const component = page.getByRole("listitem").filter({
      hasText: "Primary web tier for the deterministic acceptance fixture.",
    });
    await component
      .getByRole("link", { name: "vm-prod-01" })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/virtual-machines\/[^/?]+$/, {
      timeout: 30_000,
    });
    await expect(
      page.getByRole("article", { name: "Guest OS account svc_vm_e2e" }),
    ).toBeVisible({ timeout: 30_000 });

    const waitForReveal = () =>
      page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          /\/api\/vm\/guest-accounts\/[^/?]+\/reveal$/.test(response.url()) &&
          response.status() === 200,
      );
    const firstReveal = waitForReveal();
    await page
      .getByRole("button", { name: "Reveal password for svc_vm_e2e" })
      .click();
    await firstReveal;

    await page
      .getByRole("button", { name: "Hide password for svc_vm_e2e" })
      .click();
    await expect(
      page.getByRole("button", { name: "Reveal password for svc_vm_e2e" }),
    ).toBeVisible();

    const secondReveal = waitForReveal();
    await page
      .getByRole("button", { name: "Reveal password for svc_vm_e2e" })
      .click();
    await secondReveal;
    await page
      .getByRole("button", { name: "Hide password for svc_vm_e2e" })
      .click();
  });
});

test.describe("credential copy audit failures", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  test("reports blocked VM and Database copies when copy auditing fails", async ({ page }) => {
    test.setTimeout(90_000);
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.addInitScript(() => {
      const clipboard = navigator.clipboard;
      const writeText = clipboard.writeText.bind(clipboard);
      let writeCount = 0;
      const addStatus = () => {
        const status = document.createElement("output");
        status.setAttribute("role", "status");
        status.setAttribute("aria-label", "Clipboard write count");
        status.id = "clipboard-write-count";
        status.textContent = String(writeCount);
        document.body.append(status);
      };
      Object.defineProperty(clipboard, "writeText", {
        configurable: true,
        value: async (value: string) => {
          writeCount += 1;
          const status = document.getElementById("clipboard-write-count");
          if (status) status.textContent = String(writeCount);
          else addStatus();
          return writeText(value);
        },
      });
      document.addEventListener("DOMContentLoaded", addStatus, { once: true });
    });
    await page.goto("/dashboard/applications");
    await page.getByRole("link", { name: "Treasury Registry" }).click();
    const component = page.getByRole("listitem").filter({
      hasText: "Primary web tier for the deterministic acceptance fixture.",
    });
    await component.getByRole("link", { name: "vm-prod-01" }).click();
    await expect(page).toHaveURL(/\/dashboard\/virtual-machines\/[a-zA-Z0-9-]+$/);
    const clipboardWriteCount = page.getByRole("status", {
      name: "Clipboard write count",
    });
    await expect(clipboardWriteCount).toHaveText("0");

    await page.route(/\/api\/vm\/guest-accounts\/[a-zA-Z0-9-]+\/copy$/, async (route) =>
      route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
    );
    const vmAuditFailure = page.waitForResponse(
      (response) => response.url().includes("/vm/guest-accounts/") && response.url().endsWith("/copy") && response.status() === 503,
    );
    await page.getByRole("button", { name: "Copy password for svc_vm_e2e" }).click();
    await vmAuditFailure;
    await expect(page.getByText("Failed to copy password", { exact: true })).toBeVisible();
    await expect(clipboardWriteCount).toHaveText("0");
    await page.unroute(/\/api\/vm\/guest-accounts\/[a-zA-Z0-9-]+\/copy$/);

    await page.getByRole("button", { name: /Treasury Registry.*PROD.*Web/ }).click();
    await expect(page).toHaveURL(/\/dashboard\/applications\/[a-zA-Z0-9-]+$/);
    const returnedComponent = page.getByRole("listitem").filter({
      hasText: "Primary web tier for the deterministic acceptance fixture.",
    });
    await returnedComponent.getByRole("link", { name: /Treasury Registry DB.*registry/ }).click();
    await expect(page).toHaveURL(/\/dashboard\/databases\/[a-zA-Z0-9-]+#logical-database-[a-zA-Z0-9-]+$/);
    await expect(clipboardWriteCount).toHaveText("0");
    await page.route(/\/api\/databases\/[a-zA-Z0-9-]+\/accounts\/[a-zA-Z0-9-]+\/copy$/, async (route) =>
      route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
    );
    const databaseAuditFailure = page.waitForResponse(
      (response) => response.url().includes("/databases/") && response.url().includes("/accounts/") && response.url().endsWith("/copy") && response.status() === 503,
    );
    await page.getByRole("button", { name: "Copy password for svc_registry" }).click();
    await databaseAuditFailure;
    await expect(page.getByText("Unable to copy password", { exact: true })).toBeVisible();
    await expect(clipboardWriteCount).toHaveText("0");
  });
});
