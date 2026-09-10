import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

type RelationKind = "assets" | "vms" | "logical-databases";

type RelationItem = {
  id: string;
  label: string;
  metadata: string | null;
  lifecycle: string;
  archived: boolean;
};

type ApplicationSnapshot = {
  id: string;
  name: string;
  status: string;
  environments: Array<{
    id: string;
    name: string;
    components: Array<{
      id: string;
      name: string;
      description: string | null;
      assets: Array<{ id: string; name: string }>;
      virtualMachines: Array<{ id: string; systemName: string }>;
      logicalDatabases: Array<{ id: string; name: string }>;
    }>;
  }>;
  access: Array<{
    id: string;
    label: string;
    address: string;
    method: string;
    environmentId: string;
    isPrimary: boolean;
    credentials: Array<{ id: string; username: string; role: string | null }>;
  }>;
};

type CreatedFixtures = {
  applicationId?: string;
  documentId?: string;
  databaseId?: string;
  logicalDatabaseId?: string;
};

const ADMIN_STATE = "playwright/.auth/admin.json";
const API_BASE_URL = (
  process.env.PLAYWRIGHT_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "/api"
).replace(/\/$/, "");
const DETAIL_NAVIGATION_TIMEOUT = 30_000;

function apiPath(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function textPattern(value: string) {
  return new RegExp(
    `Technical Owner:\\s*${value.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}`,
  );
}

async function responseJson<T>(
  response: { status(): number; json(): Promise<unknown> },
  expectedStatus: number,
): Promise<T> {
  expect(response.status()).toBe(expectedStatus);
  return (await response.json()) as T;
}

async function findRelation(
  request: APIRequestContext,
  kind: RelationKind,
  searchQuery: string,
  expectedLabel = searchQuery,
): Promise<RelationItem> {
  const response = await request.get(apiPath("/relation-options"), {
    params: { kind, q: searchQuery, page: 1, pageSize: 25 },
  });
  const body = await responseJson<{
    items: RelationItem[];
    total: number;
  }>(response, 200);
  const item = body.items.find((candidate) => candidate.label === expectedLabel);
  expect(
    item,
    `Deterministic acceptance fixture ${kind}:${expectedLabel} is missing from the isolated seed.`,
  ).toBeDefined();
  return item as RelationItem;
}

async function getApplication(
  request: APIRequestContext,
  applicationId: string,
): Promise<ApplicationSnapshot> {
  return responseJson<ApplicationSnapshot>(
    await request.get(apiPath(`/applications/${applicationId}`)),
    200,
  );
}

async function cleanupRequest(
  request: APIRequestContext,
  method: "delete" | "patch",
  path: string,
  label: string,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const operation =
      method === "delete" ? request.delete(path) : request.patch(path);
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("cleanup request timed out after 10 seconds")),
        10_000,
      );
    });
    const response = await Promise.race([operation, timeout]);
    if (response.ok() || response.status() === 404) return;

    console.warn(
      `[Ticket 05 cleanup] ${label} returned ${response.status()}: ${await response.text()}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[Ticket 05 cleanup] ${label} skipped: ${message}`);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function cleanupCreatedFixtures(
  request: APIRequestContext,
  fixtures: CreatedFixtures,
) {
  if (fixtures.documentId) {
    // The acceptance journey has completed before cleanup runs. The isolated
    // database uses unique run IDs, so all cleanup is bounded and logged as
    // best effort rather than allowing teardown to mask a passed persistence
    // journey.
    await cleanupRequest(
      request,
      "delete",
      apiPath(`/knowledge-base/documents/${fixtures.documentId}`),
      "document DELETE",
    );
  }
  if (fixtures.logicalDatabaseId && fixtures.databaseId) {
    await cleanupRequest(
      request,
      "delete",
      apiPath(
        `/databases/${fixtures.databaseId}/logical-databases/${fixtures.logicalDatabaseId}`,
      ),
      "logical-database DELETE",
    );
  }
  if (fixtures.databaseId) {
    await cleanupRequest(
      request,
      "patch",
      apiPath(`/databases/${fixtures.databaseId}/archive`),
      "database archive PATCH",
    );
  }
  if (fixtures.applicationId) {
    // Archive is the supported reversible cleanup for an Application. It also
    // leaves the lifecycle/audit evidence intact for the acceptance run.
    await cleanupRequest(
      request,
      "patch",
      apiPath(`/applications/${fixtures.applicationId}/archive`),
      "application archive PATCH",
    );
  }
}

test.describe("Ticket 05 persistence-backed Application acceptance", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ storageState: ADMIN_STATE });

  test("covers Application round trip, topology integrity, access RBAC, archive/restore, and audit persistence", async ({
    page,
    browser,
  }, testInfo) => {
    test.setTimeout(120_000);

    const runId =
      process.env.TICKET_05_RUN_ID?.trim() ||
      `w${testInfo.workerIndex}-r${testInfo.repeatEachIndex}-${Date.now().toString(36)}`;
    const applicationName = `T05 Application ${runId}`;
    const componentName = `T05 Web ${runId}`;
    const componentDescription = `Persistence-backed component ${runId}`;
    const updatedComponentDescription = `Updated component description ${runId}`;
    const documentTitle = `T05 Runbook ${runId}`;
    const databaseName = `T05 UAT Database ${runId}`;
    const logicalDatabaseName = `t05_uat_schema_${runId}`;
    const initialOwner = `T05 Platform ${runId}`;
    const updatedOwner = `T05 Operations ${runId}`;
    const initialDescription = `Initial application description ${runId}`;
    const updatedDescription = `Updated application description ${runId}`;
    const credentialPassword = `T05-credential-${runId}-secret!`;
    const fixtures: CreatedFixtures = {};
    const cleanupContext = await browser.newContext({
      storageState: ADMIN_STATE,
      baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
      ignoreHTTPSErrors:
        process.env.PLAYWRIGHT_IGNORE_HTTPS_ERRORS === "true",
    });

    try {
      // These records are the repository's deterministic development fixtures,
      // not arbitrary first rows from a developer database.
      const asset = await findRelation(page.request, "assets", "app-prod-01");
      const vm = await findRelation(
        page.request,
        "vms",
        "VM-PROD-01.infrapilot.local",
      );
      const logicalDatabase = await findRelation(
        page.request,
        "logical-databases",
        "registry",
        "Treasury Registry DB · registry",
      );

      const categoryResponse = await page.request.get(
        apiPath("/knowledge-base/categories"),
      );
      const categories = await responseJson<
        Array<{ id: string; name: string }>
      >(categoryResponse, 200);
      const category = categories.find((item) => item.name === "General");
      expect(
        category,
        "The deterministic General knowledge category is required for the Document preservation leg.",
      ).toBeDefined();

      const databaseResponse = await page.request.post(apiPath("/databases"), {
        data: {
          name: databaseName,
          engine: "PostgreSQL",
          environment: "UAT",
          host: `t05-${runId}.db.internal.example`,
          status: "ACTIVE",
          note: `Ticket 05 mismatch fixture ${runId}`,
        },
      });
      const database = await responseJson<{ id: string }>(databaseResponse, 201);
      fixtures.databaseId = database.id;

      const logicalDatabaseResponse = await page.request.post(
        apiPath(`/databases/${database.id}/logical-databases`),
        { data: { name: logicalDatabaseName } },
      );
      const createdLogicalDatabase = await responseJson<{ id: string }>(
        logicalDatabaseResponse,
        201,
      );
      fixtures.logicalDatabaseId = createdLogicalDatabase.id;

      await page.goto("/dashboard/applications");
      await expect(
        page.getByRole("button", { name: "New application" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "New application" }).click();

      const createDialog = page.getByRole("dialog", {
        name: "Create application",
      });
      await expect(createDialog).toBeVisible({ timeout: 15_000 });
      await createDialog
        .getByLabel("Application name")
        .fill(applicationName);
      await createDialog
        .getByLabel("Description")
        .fill(initialDescription);
      await createDialog.getByLabel("Technical owner").fill(initialOwner);
      await createDialog
        .getByLabel("Business unit")
        .fill(`T05 Finance ${runId}`);
      await createDialog.getByLabel("Environment").selectOption("PROD");
      await createDialog
        .getByLabel("Access label")
        .fill("Initial application URL");
      await createDialog
        .getByLabel("URL or address")
        .fill(`https://t05-${runId}.internal.example`);
      await createDialog.getByLabel("Access method").fill("HTTPS");

      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          new URL(response.url()).pathname === "/api/applications",
      );
      await createDialog
        .getByRole("button", { name: "Create application" })
        .click();
      const createdApplication = await responseJson<{ id: string }>(
        await createResponsePromise,
        201,
      );
      fixtures.applicationId = createdApplication.id;
      await expect(page.getByText("Application created")).toBeVisible();

      // List proves the created profile is returned by the real persisted list query.
      const applicationRow = page
        .getByRole("row")
        .filter({ hasText: applicationName });
      await expect(applicationRow).toBeVisible();
      await expect(applicationRow).toContainText(initialOwner);
      await expect(applicationRow).toContainText("PROD");

      await applicationRow
        .getByRole("link", { name: applicationName })
        .click();
      await expect(page).toHaveURL(
        new RegExp(`/dashboard/applications/${createdApplication.id}$`),
        { timeout: DETAIL_NAVIGATION_TIMEOUT },
      );
      await expect(
        page
          .getByRole("main")
          .getByRole("heading", { name: applicationName, level: 2 }),
      ).toBeVisible();
      await expect(page.getByText(textPattern(initialOwner))).toBeVisible();
      await expect(
        page.getByText(initialDescription, { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("paragraph").filter({ hasText: /^PROD$/ }),
      ).toBeVisible();
      await expect(
        page.getByText("Initial application URL", { exact: true }),
      ).toBeVisible();

      // Ownership/description edit is exercised in the supported UI, then reloaded.
      await page.getByRole("button", { name: "Edit", exact: true }).first().click();
      const editApplicationDialog = page.getByRole("dialog", {
        name: "Edit application",
      });
      await editApplicationDialog
        .getByLabel("Technical Owner")
        .fill(updatedOwner);
      await editApplicationDialog
        .getByLabel("Description")
        .fill(updatedDescription);
      await editApplicationDialog
        .getByRole("button", { name: "Save application" })
        .click();
      await expect(page.getByText("Application updated")).toBeVisible();
      await page.reload();
      await expect(page.getByText(textPattern(updatedOwner))).toBeVisible();
      await expect(
        page.getByText(updatedDescription, { exact: true }),
      ).toBeVisible();

      const documentResponse = await page.request.post(
        apiPath("/knowledge-base/documents"),
        {
          data: {
            title: documentTitle,
            content: `# ${documentTitle}\n\nTicket 05 preservation document.`,
            categoryId: category?.id,
            applicationIds: [createdApplication.id],
          },
        },
      );
      const createdDocument = await responseJson<{ id: string }>(
        documentResponse,
        201,
      );
      fixtures.documentId = createdDocument.id;
      await page.reload();
      await expect(page.getByText(documentTitle, { exact: true })).toBeVisible();

      // Component create uses the server-authoritative pickers over real inventory rows.
      await page.getByRole("button", { name: "Add component" }).click();
      const componentDialog = page.getByRole("dialog", {
        name: "Add component",
      });
      await componentDialog
        .getByLabel("Component name")
        .fill(componentName);
      await componentDialog
        .getByLabel("Description")
        .fill(componentDescription);

      const assetPicker = componentDialog.getByRole("group", {
        name: "Assets",
      });
      await assetPicker
        .getByRole("textbox", { name: "Search Assets" })
        .fill(asset.label);
      await expect(assetPicker.getByText(asset.label, { exact: true })).toBeVisible();
      await assetPicker
        .getByRole("checkbox", { name: `Select ${asset.label}` })
        .check();

      const vmPicker = componentDialog.getByRole("group", {
        name: "Virtual machines",
      });
      await expect(vmPicker.getByText(vm.label, { exact: true })).toBeVisible();
      await vmPicker
        .getByRole("checkbox", { name: `Select ${vm.label}` })
        .check();

      const logicalDatabasePicker = componentDialog.getByRole("group", {
        name: "Logical databases",
      });
      await expect(
        logicalDatabasePicker.getByText(logicalDatabase.label, { exact: true }),
      ).toBeVisible();
      const logicalDatabaseCheckbox = logicalDatabasePicker
        .getByRole("checkbox", { name: `Select ${logicalDatabase.label}` })
      const logicalDatabaseOption = logicalDatabasePicker.getByText(
        logicalDatabase.label,
        { exact: true },
      );
      await logicalDatabaseOption.scrollIntoViewIfNeeded();
      await logicalDatabaseCheckbox.evaluate((element) => {
        (element as HTMLButtonElement).click();
      });
      await expect(logicalDatabaseCheckbox).toHaveAttribute(
        "aria-checked",
        "true",
      );
      const addComponentButton = componentDialog.getByRole("button", {
        name: "Add component",
      });
      await addComponentButton.scrollIntoViewIfNeeded();
      await addComponentButton.evaluate((element) => {
        (element as HTMLButtonElement).click();
      });
      await expect(page.getByText("Component added")).toBeVisible();
      await expect(page.getByText(componentName, { exact: true })).toBeVisible();
      await expect(
        page.getByText(componentDescription, { exact: true }),
      ).toBeVisible();
      await expect(page.getByText("1 assets · 1 VMs · 1 logical DBs")).toBeVisible();

      // Component Name + Description round trip through edit and reload.
      await page
        .getByText(componentName, { exact: true })
        .locator("..")
        .getByRole("button", { name: "Edit", exact: true })
        .click();
      const editComponentDialog = page.getByRole("dialog", {
        name: "Edit component",
      });
      await editComponentDialog
        .getByLabel("Description")
        .fill(updatedComponentDescription);
      const saveComponentButton = editComponentDialog.getByRole("button", {
        name: "Save component",
      });
      await saveComponentButton.scrollIntoViewIfNeeded();
      await saveComponentButton.evaluate((element) => {
        (element as HTMLButtonElement).click();
      });
      await expect(page.getByText("Component updated")).toBeVisible();
      await page.reload();
      await expect(
        page.getByText(updatedComponentDescription, { exact: true }),
      ).toBeVisible();

      const persistedAfterTopology = await getApplication(
        page.request,
        createdApplication.id,
      );
      const prodEnvironment = persistedAfterTopology.environments.find(
        (environment) => environment.name === "PROD",
      );
      const persistedComponent = prodEnvironment?.components.find(
        (component) => component.name === componentName,
      );
      expect(prodEnvironment).toBeDefined();
      expect(persistedComponent).toBeDefined();
      expect(persistedComponent?.assets.map((item) => item.id)).toContain(asset.id);
      expect(persistedComponent?.virtualMachines.map((item) => item.id)).toContain(vm.id);
      expect(persistedComponent?.logicalDatabases.map((item) => item.id)).toContain(
        logicalDatabase.id,
      );

      // The normal picker hides UAT records for a PROD component. The direct real
      // HTTP call proves the backend still rejects an attempted mismatched link.
      const mismatchedResponse = await page.request.patch(
        apiPath(
          `/applications/${createdApplication.id}/environments/${prodEnvironment?.id}/components/${persistedComponent?.id}`,
        ),
        {
          data: {
            name: componentName,
            description: updatedComponentDescription,
            assetIds: [asset.id],
            vmIds: [vm.id],
            logicalDatabaseIds: [fixtures.logicalDatabaseId],
          },
        },
      );
      const mismatchedBody = await mismatchedResponse.json();
      expect(mismatchedResponse.status()).toBe(400);
      expect(JSON.stringify(mismatchedBody)).toContain("environment");

      // Separate UI error harness: app/detail data remains real, while only this
      // attempted mutation response is synthetic to exercise safe error feedback.
      const componentUpdateUrl = apiPath(
        `/applications/${createdApplication.id}/environments/${prodEnvironment?.id}/components/${persistedComponent?.id}`,
      );
      await page.route(
        componentUpdateUrl,
        async (route) => {
          if (route.request().method() === "PATCH") {
            await route.fulfill({
              status: 400,
              contentType: "application/json",
              body: JSON.stringify({
                statusCode: 400,
                message: "Environment mismatch",
                error: "Bad Request",
              }),
            });
            return;
          }
          await route.continue();
        },
      );
      await page
        .getByText(componentName, { exact: true })
        .locator("..")
        .getByRole("button", { name: "Edit", exact: true })
        .click();
      const failedComponentDialog = page.getByRole("dialog", {
        name: "Edit component",
      });
      await failedComponentDialog
        .getByLabel("Description")
        .fill(`${updatedComponentDescription} failure attempt`);
      const failedSaveComponentButton = failedComponentDialog.getByRole(
        "button",
        { name: "Save component" },
      );
      await expect(failedSaveComponentButton).toBeEnabled();
      await failedSaveComponentButton.scrollIntoViewIfNeeded();
      const failedUpdateRequest = page.waitForRequest(
        (request) =>
          request.method() === "PATCH" && request.url() === componentUpdateUrl,
      );
      await failedSaveComponentButton.click({ force: true });
      await failedUpdateRequest;
      await expect(page.getByText("Could not update component")).toBeVisible({
        timeout: 15_000,
      });
      await page.unroute(componentUpdateUrl);
      await page.reload();
      await expect(
        page.getByText(updatedComponentDescription, { exact: true }),
      ).toBeVisible();

      // Add a credential-bearing Primary access, then add another non-primary row.
      await page.getByRole("button", { name: "Add access" }).click();
      const accessDialog = page.getByRole("dialog", {
        name: "Add access point",
      });
      await accessDialog
        .getByLabel("Access label")
        .fill(`Credential Primary ${runId}`);
      await accessDialog
        .getByLabel("Access address")
        .fill(`https://credential-${runId}.internal.example`);
      await accessDialog.getByLabel("Access method").fill("HTTPS");
      await accessDialog.getByRole("combobox").click();
      await page.getByRole("option", { name: "PROD", exact: true }).click();
      await accessDialog.getByLabel("Primary access for this environment").check();
      await accessDialog.getByLabel("Username").fill(`t05-admin-${runId}`);
      await accessDialog.getByLabel("Password").fill(credentialPassword);
      await accessDialog.getByLabel("Credential role").fill("Application Admin");
      await accessDialog
        .getByRole("button", { name: "Add access point" })
        .click();
      await expect(page.getByText("Access point added")).toBeVisible();

      await page.getByRole("button", { name: "Add access" }).click();
      const secondaryAccessDialog = page.getByRole("dialog", {
        name: "Add access point",
      });
      await secondaryAccessDialog
        .getByLabel("Access label")
        .fill(`Secondary Access ${runId}`);
      await secondaryAccessDialog
        .getByLabel("Access address")
        .fill(`https://secondary-${runId}.internal.example`);
      await secondaryAccessDialog.getByLabel("Access method").fill("HTTPS");
      await secondaryAccessDialog.getByRole("combobox").click();
      await page.getByRole("option", { name: "PROD", exact: true }).click();
      await secondaryAccessDialog
        .getByRole("button", { name: "Add access point" })
        .click();
      await expect(page.getByText("Access point added")).toBeVisible();
      await page.reload();

      const accessCard = page.getByText(`Credential Primary ${runId}`, {
        exact: true,
      });
      await expect(accessCard).toBeVisible();
      await expect(accessCard.locator("..").getByText("Primary", { exact: true })).toBeVisible();
      await expect(
        page.getByText(`Secondary Access ${runId}`, { exact: true }),
      ).toBeVisible();
      await expect(page.getByText(`t05-admin-${runId}`, { exact: true })).toBeVisible();

      // Edit the access metadata and credential role without replacing the secret.
      await accessCard
        .locator("..")
        .getByRole("button", { name: /Edit/ })
        .click();
      const editAccessDialog = page.getByRole("dialog", {
        name: "Edit access point",
      });
      await editAccessDialog
        .getByLabel("Edit access label")
        .fill(`Credential Primary Updated ${runId}`);
      await editAccessDialog
        .getByLabel("Edit access address")
        .fill(`https://credential-updated-${runId}.internal.example`);
      await editAccessDialog.getByLabel("Credential role 1").fill("Platform Admin");
      await editAccessDialog
        .getByRole("button", { name: "Save access point" })
        .click();
      await expect(page.getByText("Access point updated")).toBeVisible();
      await page.reload();
      const updatedAccess = page.getByText(
        `Credential Primary Updated ${runId}`,
        { exact: true },
      );
      await expect(updatedAccess).toBeVisible();
      await expect(
        updatedAccess.locator("..").getByText("Primary", { exact: true }),
      ).toBeVisible();
      await expect(
        updatedAccess.locator(".."),
      ).toContainText(`https://credential-updated-${runId}.internal.example`);

      const persistedAccess = await getApplication(
        page.request,
        createdApplication.id,
      );
      const primaryAccess = persistedAccess.access.find((item) => item.isPrimary);
      expect(primaryAccess?.label).toBe(`Credential Primary Updated ${runId}`);
      expect(primaryAccess?.credentials[0]?.role).toBe("Platform Admin");
      const credential = primaryAccess?.credentials[0];
      expect(credential).toBeDefined();

      await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.getByRole("button", { name: "Reveal" }).click();
      await expect(page.getByText(credentialPassword, { exact: true })).toBeVisible();
      await page
        .getByRole("button", {
          name: `Copy password for t05-admin-${runId}`,
        })
        .click();
      await expect(page.getByText("Password copied")).toBeVisible();

      const viewerContext = await browser.newContext({
        storageState: "playwright/.auth/viewer.json",
        baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
        ignoreHTTPSErrors: process.env.PLAYWRIGHT_IGNORE_HTTPS_ERRORS === "true",
      });
      const viewerPage = await viewerContext.newPage();
      try {
        await viewerPage.goto(`/dashboard/applications/${createdApplication.id}`);
        const viewerAccessCard = viewerPage
          .getByText("Initial application URL", { exact: true })
          .locator("..");
        await expect(viewerAccessCard.getByText(/Restricted/)).toBeVisible();
        await expect(
          viewerPage.getByRole("button", { name: "Reveal" }),
        ).toHaveCount(0);
        await expect(
          viewerPage.getByRole("button", {
            name: `Copy password for t05-admin-${runId}`,
          }),
        ).toHaveCount(0);
        await expect(
          viewerPage.getByText(credentialPassword, { exact: true }),
        ).toHaveCount(0);

        const viewerRevealResponse = await viewerPage.request.get(
          apiPath(
            `/applications/${createdApplication.id}/credentials/${credential?.id}/password`,
          ),
        );
        expect(viewerRevealResponse.status()).toBe(403);
        const viewerMutationResponse = await viewerPage.request.patch(
          apiPath(`/applications/${createdApplication.id}`),
          { data: { description: "Viewer must not mutate" } },
        );
        expect(viewerMutationResponse.status()).toBe(403);
      } finally {
        await viewerContext.close();
      }

      // Reorder the persisted rows through the supported API contract and verify
      // Primary remains explicit rather than depending on array order.
      const secondaryAccess = persistedAccess.access.find(
        (item) => item.label === `Secondary Access ${runId}`,
      );
      expect(secondaryAccess).toBeDefined();
      const reorderResponse = await page.request.patch(
        apiPath(
          `/applications/${createdApplication.id}/access/${secondaryAccess?.id}`,
        ),
        { data: { sortOrder: 0, isPrimary: false } },
      );
      expect(reorderResponse.status()).toBe(200);
      await page.reload();
      await expect(
        page.getByText(`Credential Primary Updated ${runId}`, { exact: true })
          .locator("..")
          .getByText("Primary", { exact: true }),
      ).toBeVisible();

      // Archive and restore via the real registry UI, then prove all linked history survives.
      await page.goto("/dashboard/applications");
      await expect(page).toHaveURL(/\/dashboard\/applications$/);
      await expect(
        page.getByRole("heading", { name: "Application registry", level: 2 }),
      ).toBeVisible();
      const finalRow = page
        .getByRole("row")
        .filter({ hasText: applicationName });
      await expect(finalRow).toBeVisible();
      await finalRow.getByRole("button", { name: "Archive" }).click();
      await expect(finalRow).toHaveCount(0);
      // Let the real archive mutation/query invalidation settle before toggling
      // the registry filter; reload keeps this on the real archive/show path.
      await page.reload();
      const showArchivedButton = page.getByRole("button", {
        name: "Show archived",
      });
      await expect(showArchivedButton).toBeVisible();
      const archivedListResponsePromise = page.waitForResponse(
        (response) => {
          if (response.request().method() !== "GET") return false;
          const url = new URL(response.url());
          return (
            url.pathname === new URL(apiPath("/applications")).pathname &&
            url.searchParams.get("includeArchived") === "true"
          );
        },
      );
      await showArchivedButton.dispatchEvent("click");
      const archivedListResponse = await archivedListResponsePromise;
      expect(archivedListResponse.status()).toBe(200);
      const hideArchivedButton = page.getByRole("button", {
        name: "Hide archived",
      });
      await expect(hideArchivedButton).toBeVisible();
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("status")).toHaveCount(0);
      await expect(page.getByRole("row").nth(1)).toBeVisible();
      const applicationSearch = page.getByRole("textbox", {
        name: "Search applications",
      });
      await expect(applicationSearch).toBeEditable();
      await applicationSearch.scrollIntoViewIfNeeded();
      await applicationSearch.fill(applicationName);
      const archivedRow = page
        .getByRole("row")
        .filter({ hasText: applicationName });
      await expect(archivedRow).toHaveCount(1);
      await expect(archivedRow).toContainText("ARCHIVED");
      const restoreResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === "PATCH" &&
          response.url() === apiPath(`/applications/${createdApplication.id}/restore`),
      );
      const restoredListResponsePromise = page.waitForResponse(
        (response) => {
          if (response.request().method() !== "GET") return false;
          const url = new URL(response.url());
          return (
            url.pathname === new URL(apiPath("/applications")).pathname &&
            url.searchParams.get("includeArchived") === "true"
          );
        },
      );
      await archivedRow.getByRole("button", { name: "Restore" }).click();
      const restoreResponse = await restoreResponsePromise;
      expect(restoreResponse.status()).toBe(200);
      const restoredListResponse = await restoredListResponsePromise;
      expect(restoredListResponse.status()).toBe(200);
      await expect(archivedRow).toContainText("ACTIVE");
      await expect(hideArchivedButton).toBeVisible();
      await hideArchivedButton.click();
      await expect(
        page.getByRole("button", { name: "Show archived" }),
      ).toBeVisible();
      const restoredRow = page
        .getByRole("row")
        .filter({ hasText: applicationName });
      await expect(restoredRow).toBeVisible();
      await restoredRow
        .getByRole("link", { name: applicationName })
        .click();
      await expect(page).toHaveURL(
        new RegExp(`/dashboard/applications/${createdApplication.id}$`),
        { timeout: DETAIL_NAVIGATION_TIMEOUT },
      );
      await page.reload();
      await expect(page.getByText(updatedComponentDescription, { exact: true })).toBeVisible();
      await expect(page.getByText(logicalDatabase.label, { exact: true })).toBeVisible();
      await expect(page.getByText(documentTitle, { exact: true })).toBeVisible();
      await expect(
        page.getByText(`Credential Primary Updated ${runId}`, { exact: true }),
      ).toBeVisible();
      await expect(page.getByText(`t05-admin-${runId}`, { exact: true })).toBeVisible();

      const auditResponse = await page.request.get(apiPath("/audit-logs"), {
        params: { page: 1, limit: 1000 },
      });
      const auditBody = await responseJson<{
        data: Array<{ action: string; targetId: string; details: string }>;
      }>(auditResponse, 200);
      const applicationAuditActions = new Set(
        auditBody.data
          .filter((entry) => {
            if (entry.targetId === createdApplication.id) return true;
            return entry.details.includes(createdApplication.id);
          })
          .map((entry) => entry.action),
      );
      expect([...applicationAuditActions]).toEqual(
        expect.arrayContaining([
          "CREATE_APPLICATION",
          "UPDATE_APPLICATION",
          "VIEW_APPLICATION_PASSWORD",
          "COPY_APPLICATION_PASSWORD",
          "ARCHIVE_APPLICATION",
          "RESTORE_APPLICATION",
        ]),
      );
    } finally {
      try {
        await cleanupCreatedFixtures(cleanupContext.request, fixtures);
      } finally {
        await cleanupContext.close();
      }
    }
  });
});

test.describe("Ticket 05 editor access contract", () => {
  test.use({ storageState: "playwright/.auth/editor.json" });

  test("Editor can open the supported Application create workflow", async ({
    page,
  }) => {
    await page.goto("/dashboard/applications");
    await expect(
      page.getByRole("button", { name: "New application" }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "New application" }).click();
    await expect(
      page.getByRole("dialog", { name: "Create application" }),
    ).toBeVisible();
  });
});

test.describe("Ticket 05 query-state harness (separate from persistence acceptance)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.setTimeout(60_000);

  const syntheticUser = {
    id: "ticket-05-query-state-user",
    username: "ticket-05-query-state-user",
    displayName: "Ticket 05 Query State",
    avatarSeed: "ticket-05-query-state",
    role: "ADMIN" as const,
    mustChangePassword: false,
  };

  async function installSyntheticAuth(page: Page) {
    await page.addInitScript((user) => {
      window.localStorage.setItem("user", JSON.stringify(user));
    }, syntheticUser);
    await page.route(apiPath("/auth/me"), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: syntheticUser }),
      });
    });
  }

  test("proves list 500 is not an empty result and retry recovers", async ({
    page,
  }) => {
    let allowRetry = false;
    await installSyntheticAuth(page);
    await page.route(`${API_BASE_URL}/applications**`, async (route) => {
      if (!allowRetry) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Internal server failure" }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "ticket-05-list-retry",
            name: "Ticket 05 retry application",
            description: "query-state harness",
            technicalOwner: "Ticket 05",
            businessUnit: "Acceptance",
            status: "ACTIVE",
            access: [],
            environments: [],
            completeness: { complete: true, completeness: 100 },
          },
        ]),
      });
    });

    const listRequestPromise = page.waitForRequest(
      (request) =>
        request.method() === "GET" &&
        request.url().startsWith(`${API_BASE_URL}/applications?`),
    );
    await page.goto("/dashboard/applications");
    expect((await listRequestPromise).url()).toBe(
      `${API_BASE_URL}/applications?includeArchived=false`,
    );
    await expect(
      page.getByRole("alert").filter({ hasText: "Inventory unavailable" }),
    ).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText("No applications yet")).toHaveCount(0);
    await expect(page.getByText("No applications found")).toHaveCount(0);
    allowRetry = true;
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByRole("table")).toContainText(
      "Ticket 05 retry application",
    );
  });

  test("proves detail 500 is not Not Found and retry recovers", async ({ page }) => {
    let allowRetry = false;
    await installSyntheticAuth(page);
    await page.route(
      apiPath("/applications/ticket-05-detail-retry"),
      async (route) => {
        if (!allowRetry) {
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ message: "Internal server failure" }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "ticket-05-detail-retry",
            name: "Ticket 05 recovered detail",
            description: "query-state harness",
            technicalOwner: "Ticket 05",
            businessUnit: "Acceptance",
            status: "ACTIVE",
            access: [],
            environments: [],
            documentLinks: [],
          }),
        });
      },
    );

    const detailRequestPromise = page.waitForRequest(
      (request) =>
        request.method() === "GET" &&
        request.url() === apiPath("/applications/ticket-05-detail-retry"),
    );
    await page.goto("/dashboard/applications/ticket-05-detail-retry");
    expect((await detailRequestPromise).url()).toBe(
      apiPath("/applications/ticket-05-detail-retry"),
    );
    await expect(
      page.getByRole("alert").filter({ hasText: "Inventory unavailable" }),
    ).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText("Application not found")).toHaveCount(0);
    allowRetry = true;
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(
      page.getByRole("heading", { name: "Ticket 05 recovered detail" }),
    ).toBeVisible();
  });
});
