import {
  expect,
  request as playwrightRequest,
  test,
  type APIRequestContext,
  type APIResponse,
  type Page,
} from "@playwright/test";

const ADMIN_STATE = "playwright/.auth/admin.json";
const EDITOR_STATE = "playwright/.auth/editor.json";
const VIEWER_STATE = "playwright/.auth/viewer.json";
const API_BASE_URL = (
  process.env.PLAYWRIGHT_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "/api"
).replace(/\/$/, "");

type Application = {
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
      assets: Array<{
        id: string;
        relationType: string;
        responsibleParty: string | null;
      }>;
      virtualMachines: Array<{ id: string; relationType: string }>;
      logicalDatabases: Array<{ id: string; status: string; archived: boolean }>;
    }>;
    access: Array<{
      id: string;
      environmentId: string;
      isPrimary: boolean;
      address: string;
      credentials: Array<{ id: string; username: string; hasPassword: boolean }>;
    }>;
  }>;
  access: Array<{
    id: string;
    environmentId: string;
    isPrimary: boolean;
    address: string;
    credentials: Array<{ id: string; username: string; hasPassword: boolean }>;
  }>;
  documentLinks: Array<{ id: string; title: string }>;
};

type Asset = {
  id: string;
  name: string;
  status: string;
  ipAllocations: Array<{ address: string; credentialIds: string[] }>;
  credentials: Array<{ id: string; username: string; hasPassword?: boolean }>;
  componentLinks: Array<{ componentId: string; relationType: string; responsibleParty: string | null }>;
  documentLinks: Array<{ id: string; title: string }>;
};

type Vm = {
  id: string;
  systemName: string;
  lifecycleState: string;
  components: Array<{ id: string; relationType: string; responsibleParty: string | null }>;
  guestAccounts: Array<{ id: string; username: string }>;
  documentLinks: Array<{ id: string; title: string }>;
};

type Database = {
  id: string;
  name: string;
  status: string | null;
  environment: string | null;
  hostVmId: string | null;
  logicalDatabases: Array<{ id: string; name: string; status?: string }>;
  accounts: Array<{ id: string; username: string; scope: string; logicalDatabaseIds: string[] }>;
  documentLinks: Array<{ id: string; title: string }>;
};

type Source = {
  id: string;
  name: string;
  status: string;
  hasCredential: boolean;
};

function apiPath(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function expectStatus(response: APIResponse, expected: number, label: string) {
  expect(response.status(), label).toBe(expected);
}

async function json<T>(response: APIResponse, expected: number, label: string) {
  await expectStatus(response, expected, label);
  return (await response.json()) as T;
}

async function get<T>(api: APIRequestContext, path: string) {
  return json<T>(await api.get(apiPath(path)), 200, `GET ${path}`);
}

async function mutate<T>(
  response: Promise<APIResponse>,
  expected: number,
  label: string,
) {
  return json<T>(await response, expected, label);
}

async function restoreIfNeeded(
  api: APIRequestContext,
  path: string | undefined,
) {
  if (!path) return;
  const response = path.includes("/vm/inventory/")
    ? await api.post(apiPath(path))
    : await api.patch(apiPath(path));
  expect([200, 201, 404], `restore cleanup ${path}`).toContain(response.status());
}

async function archiveIfNeeded(
  api: APIRequestContext,
  path: string | undefined,
) {
  if (!path) return;
  const response = await api.patch(apiPath(path));
  expect([200, 404], `archive cleanup ${path}`).toContain(response.status());
}

async function closeContext(api: APIRequestContext | undefined) {
  await api?.dispose();
}

test.describe("Ticket 15 serialized relationship, RBAC, archive, and persistence matrix", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ storageState: ADMIN_STATE });

  test("proves server invariants, preserved topology, role boundaries, and re-read persistence", async ({
    page,
  }, testInfo) => {
    test.setTimeout(240_000);

    const runId =
      process.env.TICKET_15_RUN_ID?.trim() ??
      `w${testInfo.workerIndex}-r${testInfo.repeatEachIndex}-${Date.now().toString(36)}`;
    const api = page.request;
    let editorApi: APIRequestContext | undefined;
    let viewerApi: APIRequestContext | undefined;
    const created: {
      applicationId?: string;
      assetId?: string;
      databaseId?: string;
      logicalDatabaseId?: string;
      uatDatabaseId?: string;
      uatLogicalDatabaseId?: string;
      documentId?: string;
      vmId?: string;
      sourceId?: string;
    } = {};

    const applicationName = `T15 Relationship Matrix ${runId}`;
    const componentName = `T15 PROD Component ${runId}`;
    const uatComponentName = `T15 UAT Component ${runId}`;
    const accountPassword = `T15-db-secret-${runId}!`;
    const appPassword = `T15-app-secret-${runId}!`;

    try {
      const application = await mutate<Application>(
        api.post(apiPath("/applications"), {
          data: {
            name: applicationName,
            technicalOwner: `T15 Platform ${runId}`,
            businessUnit: `T15 Operations ${runId}`,
            description: `T15 application preservation ${runId}`,
            environments: [{ name: "PROD" }, { name: "UAT" }],
          },
        }),
        201,
        "create Ticket 15 application",
      );
      created.applicationId = application.id;
      const prod = application.environments.find((item) => item.name === "PROD");
      const uat = application.environments.find((item) => item.name === "UAT");
      expect(prod).toBeDefined();
      expect(uat).toBeDefined();

      const withComponents = await mutate<Application>(
        api.post(
          apiPath(`/applications/${application.id}/environments/${prod?.id}/components`),
          { data: { name: componentName, description: `T15 topology ${runId}` } },
        ),
        201,
        "create PROD component",
      );
      const prodComponent = withComponents.environments
        .find((item) => item.name === "PROD")
        ?.components.find((item) => item.name === componentName);
      expect(prodComponent).toBeDefined();

      const withUatComponent = await mutate<Application>(
        api.post(
          apiPath(`/applications/${application.id}/environments/${uat?.id}/components`),
          { data: { name: uatComponentName, description: `T15 UAT topology ${runId}` } },
        ),
        201,
        "create UAT component",
      );
      const uatComponent = withUatComponent.environments
        .find((item) => item.name === "UAT")
        ?.components.find((item) => item.name === uatComponentName);
      expect(uatComponent).toBeDefined();

      const vmList = await get<{ data: Vm[] }>(
        api,
        "/vm/inventory?q=vm-prod-01&view=ACTIVE&limit=20",
      );
      const vm = vmList.data.find((item) => item.systemName === "VM-PROD-01.infrapilot.local");
      expect(vm, "the isolated seed must contain the PROD VM fixture").toBeDefined();
      created.vmId = vm?.id;
      if (!created.vmId) throw new Error("Missing seeded PROD VM id");

      const database = await mutate<Database>(
        api.post(apiPath("/databases"), {
          data: {
            name: `T15 PROD Database ${runId}`,
            engine: "PostgreSQL",
            version: "16",
            environment: "PROD",
            hostVmId: created.vmId,
            host: `t15-db-host-${runId}`,
            owner: `T15 DBA ${runId}`,
            backupPolicy: `Daily T15 backup ${runId}`,
            accounts: [
              {
                username: `t15_admin_${runId}`,
                password: accountPassword,
                role: "DBA",
                privileges: ["SELECT", "UPDATE"],
                scope: "INSTANCE",
              },
            ],
            logicalDatabases: [`t15_schema_${runId}`],
          },
        }),
        201,
        "create PROD database",
      );
      created.databaseId = database.id;
      created.logicalDatabaseId = database.logicalDatabases[0]?.id;
      expect(created.logicalDatabaseId).toBeDefined();

      const uatDatabase = await mutate<Database>(
        api.post(apiPath("/databases"), {
          data: {
            name: `T15 UAT Database ${runId}`,
            engine: "PostgreSQL",
            environment: "UAT",
            host: `t15-uat-db-host-${runId}`,
            logicalDatabases: [`t15_uat_schema_${runId}`],
          },
        }),
        201,
        "create UAT database",
      );
      created.uatDatabaseId = uatDatabase.id;
      created.uatLogicalDatabaseId = uatDatabase.logicalDatabases[0]?.id;
      expect(created.uatLogicalDatabaseId).toBeDefined();

      await expectStatus(
        await api.post(apiPath("/databases"), {
          data: {
            name: `T15 invalid host database ${runId}`,
            engine: "PostgreSQL",
            environment: "UAT",
            hostVmId: created.vmId,
          },
        }),
        400,
        "reject UAT database on PROD Host VM",
      );

      const asset = await mutate<Asset>(
        api.post(apiPath("/assets"), {
          data: {
            name: `T15 Asset ${runId}`,
            assetId: `T15-ASSET-${runId}`,
            type: "SERVER",
            location: `T15 rack ${runId}`,
            sn: `T15-SN-${runId}`,
            owner: `T15 Asset Owner ${runId}`,
            dependencies: `T15 dependency ${runId}`,
            ips: [{ address: "10.215.15.30", type: "Host", manageType: "SSH" }],
            credentials: [
              {
                username: `t15_asset_${runId}`,
                password: appPassword,
                type: "SSH",
              },
            ],
            componentLinks: [
              {
                componentId: prodComponent?.id,
                relationType: "PRIMARY",
                responsibleParty: `T15 Asset Operations ${runId}`,
              },
            ],
          },
        }),
        201,
        "create asset with PRIMARY relation and credential",
      );
      created.assetId = asset.id;

      const linkedApplication = await mutate<Application>(
        api.patch(
          apiPath(`/applications/${application.id}/environments/${prod?.id}/components/${prodComponent?.id}`),
          {
            data: {
              name: componentName,
              description: `T15 topology edited without relation loss ${runId}`,
              assetIds: [asset.id],
              vmIds: [created.vmId],
              logicalDatabaseIds: [created.logicalDatabaseId],
            },
          },
        ),
        200,
        "link same-environment asset VM and Logical Database",
      );
      const linkedComponent = linkedApplication.environments
        .find((item) => item.name === "PROD")
        ?.components.find((item) => item.id === prodComponent?.id);
      expect(linkedComponent?.assets[0]).toMatchObject({
        id: asset.id,
        relationType: "PRIMARY",
        responsibleParty: `T15 Asset Operations ${runId}`,
      });
      expect(linkedComponent?.virtualMachines.map((item) => item.id)).toContain(created.vmId);
      expect(linkedComponent?.logicalDatabases.map((item) => item.id)).toContain(created.logicalDatabaseId);

      await expectStatus(
        await api.patch(
          apiPath(`/applications/${application.id}/environments/${uat?.id}/components/${uatComponent?.id}`),
          { data: { name: uatComponentName, vmIds: [created.vmId] } },
        ),
        400,
        "reject cross-environment PROD VM link",
      );
      await expectStatus(
        await api.patch(
          apiPath(`/applications/${application.id}/environments/${prod?.id}/components/${prodComponent?.id}`),
          {
            data: {
              name: componentName,
              logicalDatabaseIds: [created.uatLogicalDatabaseId],
            },
          },
        ),
        400,
        "reject cross-environment UAT Logical Database link",
      );

      await expectStatus(
        await api.patch(
          apiPath(`/assets/${asset.id}`),
          {
            data: {
              componentLinks: [
                {
                  componentId: uatComponent?.id,
                  relationType: "PRIMARY",
                },
              ],
            },
          },
        ),
        400,
        "reject duplicate PRIMARY Asset relation",
      );
      await expectStatus(
        await api.patch(
          apiPath(`/vm/inventory/${created.vmId}`),
          {
            data: {
              componentLinks: [
                { componentId: uatComponent?.id, relationType: "PRIMARY" },
              ],
            },
          },
        ),
        400,
        "reject duplicate PRIMARY VM relation or environment mismatch",
      );

      const categoryList = await get<Array<{ id: string }>>(api, "/knowledge-base/categories");
      const categoryId = categoryList[0]?.id;
      expect(categoryId).toBeDefined();
      const document = await mutate<{ id: string }>(
        api.post(apiPath("/knowledge-base/documents"), {
          data: {
            title: `T15 preservation document ${runId}`,
            content: `T15 linked history ${runId}`,
            categoryId,
            applicationIds: [application.id],
            assetIds: [asset.id],
            vmIds: [created.vmId],
            databaseIds: [created.databaseId],
          },
        }),
        201,
        "create linked document",
      );
      created.documentId = document.id;

      const appAccess = await mutate<Application>(
        api.post(apiPath(`/applications/${application.id}/access`), {
          data: {
            label: `T15 PROD Console ${runId}`,
            address: `https://t15-${runId}.example.test`,
            method: "HTTPS",
            environmentId: prod?.id,
            isPrimary: true,
            credentials: [{ username: `t15_app_${runId}`, password: appPassword, role: "Operator" }],
          },
        }),
        201,
        "create primary Application Access",
      );
      const applicationCredential = appAccess.access.find((item) => item.environmentId === prod?.id)
        ?.credentials.find((item) => item.username === `t15_app_${runId}`);
      expect(applicationCredential?.hasPassword).toBe(true);

      editorApi = await playwrightRequest.newContext({
        baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
        storageState: EDITOR_STATE,
        ignoreHTTPSErrors: process.env.PLAYWRIGHT_IGNORE_HTTPS_ERRORS === "true",
      });
      viewerApi = await playwrightRequest.newContext({
        baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
        storageState: VIEWER_STATE,
        ignoreHTTPSErrors: process.env.PLAYWRIGHT_IGNORE_HTTPS_ERRORS === "true",
      });
      await expectStatus(
        await editorApi.patch(apiPath(`/applications/${application.id}`), {
          data: { description: `T15 editor update ${runId}` },
        }),
        200,
        "allow Editor operational application update",
      );
      await expectStatus(
        await editorApi.get(apiPath("/users")),
        403,
        "deny Editor user-management read",
      );
      await expectStatus(
        await editorApi.patch(apiPath(`/applications/${application.id}/archive`)),
        403,
        "deny Editor application archive",
      );
      await expectStatus(
        await editorApi.patch(apiPath(`/vm/sources/00000000-0000-0000-0000-000000000015/archive`)),
        403,
        "deny Editor source archive",
      );
      await expectStatus(
        await editorApi.post(apiPath("/export/inventory"), { data: {} }),
        403,
        "deny Editor sensitive export",
      );

      const viewerApplication = await get<Application>(
        viewerApi,
        `/applications/${application.id}`,
      );
      const viewerAccess = viewerApplication.access.find((item) => item.environmentId === prod?.id);
      expect(viewerAccess?.address).toBe("[restricted]");
      expect(viewerAccess?.credentials[0]).not.toHaveProperty("encryptedPassword");
      await expectStatus(
        await viewerApi.patch(apiPath(`/applications/${application.id}`), {
          data: { description: "viewer must not write" },
        }),
        403,
        "deny Viewer application update",
      );
      await expectStatus(
        await viewerApi.get(
          apiPath(`/applications/${application.id}/credentials/${applicationCredential?.id}/password`),
        ),
        403,
        "deny Viewer application secret reveal",
      );
      await expectStatus(
        await api.get(
          apiPath(`/applications/${application.id}/credentials/${applicationCredential?.id}/password`),
        ),
        200,
        "allow Admin application secret reveal",
      );

      await archiveIfNeeded(api, `/assets/${asset.id}/archive`);
      await expectStatus(
        await api.post(
          apiPath(`/applications/${application.id}/environments/${uat?.id}/components`),
          { data: { name: `T15 Archived Asset Target ${runId}`, assetIds: [asset.id] } },
        ),
        400,
        "reject archived Asset as new relation target",
      );
      const archivedAsset = await get<Asset>(api, `/assets/${asset.id}`);
      expect(archivedAsset.status).toBe("ARCHIVED");
      expect(archivedAsset.credentials.map((item) => item.username)).toContain(`t15_asset_${runId}`);
      await restoreIfNeeded(api, `/assets/${asset.id}/restore`);

      await mutate<{ status: string }>(
        api.post(apiPath(`/vm/inventory/${created.vmId}/archive`)),
        201,
        "archive VM while retaining history",
      );
      await expectStatus(
        await api.post(
          apiPath(`/applications/${application.id}/environments/${uat?.id}/components`),
          { data: { name: `T15 Archived VM Target ${runId}`, vmIds: [created.vmId] } },
        ),
        400,
        "reject archived VM as new relation target",
      );
      const archivedVm = await get<Vm>(api, `/vm/inventory/${created.vmId}`);
      expect(archivedVm.lifecycleState).toBe("ARCHIVED");
      expect(archivedVm.guestAccounts.length).toBeGreaterThan(0);
      expect(archivedVm.components.map((item) => item.id)).toContain(prodComponent?.id);
      await restoreIfNeeded(api, `/vm/inventory/${created.vmId}/restore`);

      await mutate<{ status: string }>(
        api.delete(apiPath(`/databases/${created.databaseId}/logical-databases/${created.logicalDatabaseId}`)),
        200,
        "archive Logical Database while retaining history",
      );
      await expectStatus(
        await api.post(
          apiPath(`/applications/${application.id}/environments/${uat?.id}/components`),
          { data: { name: `T15 Archived Logical Target ${runId}`, logicalDatabaseIds: [created.logicalDatabaseId] } },
        ),
        400,
        "reject archived Logical Database as new relation target",
      );
      await mutate<{ status: string }>(
        api.patch(apiPath(`/databases/${created.databaseId}/logical-databases/${created.logicalDatabaseId}/restore`)),
        200,
        "restore Logical Database",
      );

      const sourceList = await get<Source[]>(api, "/vm/sources");
      const source = sourceList.find((item) => item.name === "development-vcenter");
      expect(source, "the isolated seed must contain the vCenter source fixture").toBeDefined();
      created.sourceId = source?.id;
      if (!created.sourceId) throw new Error("Missing source fixture id");
      if (source?.status === "ARCHIVED") {
        await restoreIfNeeded(api, `/vm/sources/${created.sourceId}/restore`);
      }
      await mutate<{ status: string }>(
        api.patch(apiPath(`/vm/sources/${created.sourceId}/archive`)),
        200,
        "Admin archives vCenter Source",
      );
      await expectStatus(
        await api.post(apiPath(`/vm/sources/${created.sourceId}/sync`)),
        400,
        "block sync for archived source",
      );
      const archivedSource = (await get<Source[]>(api, "/vm/sources")).find(
        (item) => item.id === created.sourceId,
      );
      expect(archivedSource).toMatchObject({ status: "ARCHIVED", hasCredential: source?.hasCredential });
      await restoreIfNeeded(api, `/vm/sources/${created.sourceId}/restore`);

      await mutate<Application>(
        api.patch(apiPath(`/applications/${application.id}/archive`)),
        200,
        "Admin archives Application",
      );
      const archivedApplication = await get<Application>(api, `/applications/${application.id}`);
      expect(archivedApplication).toMatchObject({ id: application.id, status: "ARCHIVED" });
      expect(archivedApplication.environments.flatMap((item) => item.components).map((item) => item.id)).toContain(prodComponent?.id);
      expect(archivedApplication.documentLinks.map((item) => item.id)).toContain(created.documentId);
      await mutate<Application>(
        api.patch(apiPath(`/applications/${application.id}/restore`)),
        200,
        "Admin restores Application",
      );

      await archiveIfNeeded(api, `/databases/${created.databaseId}/archive`);
      const archivedDatabase = await get<Database>(api, `/databases/${created.databaseId}`);
      expect(archivedDatabase.status).toBe("ARCHIVED");
      expect(archivedDatabase.accounts.map((item) => item.username)).toContain(`t15_admin_${runId}`);
      expect(archivedDatabase.logicalDatabases.map((item) => item.id)).toContain(created.logicalDatabaseId);
      await restoreIfNeeded(api, `/databases/${created.databaseId}/restore`);

      const restoredApplication = await get<Application>(api, `/applications/${application.id}`);
      expect(restoredApplication.status).toBe("ACTIVE");
      expect(restoredApplication.documentLinks.map((item) => item.id)).toContain(created.documentId);
      const restoredAsset = await get<Asset>(api, `/assets/${asset.id}`);
      expect(restoredAsset.componentLinks.map((item) => item.componentId)).toContain(prodComponent?.id);
      expect(restoredAsset.credentials.map((item) => item.username)).toContain(`t15_asset_${runId}`);
      const restoredVm = await get<Vm>(api, `/vm/inventory/${created.vmId}`);
      expect(restoredVm.lifecycleState).toBe("ACTIVE");
      expect(restoredVm.documentLinks.map((item) => item.id)).toContain(created.documentId);
      const restoredDatabase = await get<Database>(api, `/databases/${created.databaseId}`);
      expect(restoredDatabase.status).toBe("ACTIVE");
      expect(restoredDatabase.documentLinks.map((item) => item.id)).toContain(created.documentId);
      expect(restoredDatabase.accounts.map((item) => item.username)).toContain(`t15_admin_${runId}`);

      await page.goto(`/dashboard/applications/${application.id}`);
      await expect(page.getByRole("heading", { name: applicationName }).last()).toBeVisible();
      await page.reload();
      await expect(page.getByRole("heading", { name: applicationName }).last()).toBeVisible();
      await expect(page.getByText(`T15 editor update ${runId}`, { exact: true })).toBeVisible();
    } finally {
      await restoreIfNeeded(api, created.sourceId && `/vm/sources/${created.sourceId}/restore`).catch(() => undefined);
      await restoreIfNeeded(api, created.logicalDatabaseId && created.databaseId
        ? `/databases/${created.databaseId}/logical-databases/${created.logicalDatabaseId}/restore`
        : undefined).catch(() => undefined);
      await restoreIfNeeded(api, created.vmId && `/vm/inventory/${created.vmId}/restore`).catch(() => undefined);
      await restoreIfNeeded(api, created.databaseId && `/databases/${created.databaseId}/restore`).catch(() => undefined);
      await restoreIfNeeded(api, created.assetId && `/assets/${created.assetId}/restore`).catch(() => undefined);
      await restoreIfNeeded(api, created.applicationId && `/applications/${created.applicationId}/restore`).catch(() => undefined);
      if (created.uatDatabaseId) {
        await archiveIfNeeded(api, `/databases/${created.uatDatabaseId}/archive`).catch(() => undefined);
      }
      if (created.documentId) {
        await api.delete(apiPath(`/knowledge-base/documents/${created.documentId}`)).catch(() => undefined);
      }
      await closeContext(editorApi);
      await closeContext(viewerApi);
    }
  });
});
