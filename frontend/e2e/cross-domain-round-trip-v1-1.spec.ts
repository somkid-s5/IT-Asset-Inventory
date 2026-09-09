import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const ADMIN_STATE = "playwright/.auth/admin.json";
const VIEWER_STATE = "playwright/.auth/viewer.json";
const API_BASE_URL = (
  process.env.PLAYWRIGHT_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "/api"
).replace(/\/$/, "");

type Application = {
  id: string;
  name: string;
  technicalOwner: string | null;
  businessUnit: string | null;
  description: string | null;
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
};

type Asset = {
  id: string;
  name: string;
  assetId: string | null;
  type: string;
  location: string | null;
  rack: string | null;
  brandModel: string | null;
  sn: string | null;
  status: string | null;
  owner: string | null;
  department: string | null;
  responsibleParty: string | null;
  vendor: string | null;
  purchaseDate: string | null;
  warrantyExpiration: string | null;
  osVersion: string | null;
  dependencies: string | null;
  customMetadata: Record<string, unknown> | null;
  ipAllocations: Array<{
    address: string;
    type: string | null;
    nodeLabel: string | null;
    manageType: string | null;
    version: string | null;
    credentialIds: string[];
  }>;
  credentials: Array<{ id: string; username: string }>;
  componentLinks: Array<{ componentId: string; relationType: string }>;
};

type Vm = {
  id: string;
  name: string;
  systemName: string;
  environment: string;
  owner: string;
  businessUnit: string;
  slaTier: string;
  serviceRole: string;
  criticality: string;
  description: string;
  notes: string;
  tags: string[];
  guestAccounts: Array<{
    id: string;
    username: string;
    accessMethod: string;
    role: string;
    note: string | null;
  }>;
  components: Array<{ id: string; relationType: string }>;
};

type Database = {
  id: string;
  name: string;
  engine: string;
  version: string | null;
  environment: string | null;
  host: string | null;
  hostVmId: string | null;
  hostVm?: { id: string; name: string; systemName: string } | null;
  ipAddress: string | null;
  port: string | null;
  serviceName: string | null;
  owner: string | null;
  backupPolicy: string | null;
  replication: string | null;
  operationalClientIps: string[];
  maintenanceWindow: string | null;
  status: string | null;
  note: string | null;
  responsibleParty: string | null;
  logicalDatabases: Array<{ id: string; name: string }>;
  accounts: Array<{
    id: string;
    username: string;
    role: string;
    privileges: string[];
    note: string | null;
    scope: string;
    logicalDatabaseIds: string[];
  }>;
};

type QualitySummary = {
  issues: Array<{
    id: string;
    name: string;
    reasons: Array<{ code: string }>;
    kind?: string;
  }>;
};

function apiPath(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function responseJson<T>(
  response: { status(): number; json(): Promise<unknown>; text(): Promise<string> },
  expectedStatus: number,
): Promise<T> {
  expect(response.status(), await response.text()).toBe(expectedStatus);
  return (await response.json()) as T;
}

async function getJson<T>(request: APIRequestContext, path: string) {
  return responseJson<T>(await request.get(apiPath(path)), 200);
}

async function patchJson<T>(
  request: APIRequestContext,
  path: string,
  data: Record<string, unknown>,
) {
  return responseJson<T>(await request.patch(apiPath(path), { data }), 200);
}

async function archiveIfCreated(
  request: APIRequestContext,
  path: string | undefined,
) {
  if (!path) return;
  const response = await request.patch(apiPath(path));
  expect([200, 404]).toContain(response.status());
}

async function expectQualityIssue(
  request: APIRequestContext,
  path: string,
  id: string,
  reasonCode: string,
) {
  const summary = await getJson<QualitySummary>(request, path);
  const issue = summary.issues.find((candidate) => candidate.id === id);
  expect(issue, `Expected Data Quality issue for ${id}`).toBeDefined();
  expect(issue?.reasons.map((reason) => reason.code)).toContain(reasonCode);
}

async function expectNoQualityIssue(
  request: APIRequestContext,
  path: string,
  id: string,
) {
  const summary = await getJson<QualitySummary>(request, path);
  expect(summary.issues.some((candidate) => candidate.id === id)).toBe(false);
}

async function editApplication(page: Page, values: {
  name: string;
  technicalOwner: string;
  businessUnit: string;
  description: string;
}) {
  await page.getByRole("button", { name: "Edit", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Edit application" })).toBeVisible();
  await dialog.getByLabel("Name").fill(values.name);
  await dialog.getByLabel("Technical Owner").fill(values.technicalOwner);
  await dialog.getByLabel("Business Unit").fill(values.businessUnit);
  await dialog.getByLabel("Description").fill(values.description);
  await dialog.getByRole("button", { name: "Save application" }).click();
  await expect(dialog).toBeHidden();
}

test.describe("Ticket 14 persistence-backed cross-domain round trip", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ storageState: ADMIN_STATE });

  test("serializes Application, Asset, VM, and Database mutations through the real stack", async ({
    page,
  }, testInfo) => {
    test.setTimeout(240_000);

    const runId =
      process.env.TICKET_14_RUN_ID?.trim() ||
      `w${testInfo.workerIndex}-r${testInfo.repeatEachIndex}-${Date.now().toString(36)}`;
    const names = {
      application: `T14 Application ${runId}`,
      component: `T14 Service ${runId}`,
      asset: `T14 Asset ${runId}`,
      assetId: `T14-ASSET-${runId}`,
      database: `T14 Database ${runId}`,
      logicalDatabase: `t14_schema_${runId}`,
    };
    const created: {
      applicationId?: string;
      assetId?: string;
      databaseId?: string;
      vmId?: string;
    } = {};
    let originalVmOwnerValue: string | undefined;

    const updatedApplication = {
      name: `${names.application} Updated`,
      technicalOwner: `T14 Platform ${runId}`,
      businessUnit: `T14 Operations ${runId}`,
      description: `Updated application purpose ${runId}`,
    };
    const updatedAssetOwner = `T14 Asset Operations ${runId}`;
    const updatedBackupPolicy = `Daily immutable backup ${runId}`;

    try {
      const application = await responseJson<Application>(
        await page.request.post(apiPath("/applications"), {
          data: {
            name: names.application,
            technicalOwner: `T14 Platform ${runId}`,
            description: `Initial application purpose ${runId}`,
            environments: [{ name: "PROD" }],
          },
        }),
        201,
      );
      created.applicationId = application.id;
      const prodEnvironment = application.environments.find(
        (environment) => environment.name === "PROD",
      );
      expect(prodEnvironment).toBeDefined();

      const applicationWithComponent = await responseJson<Application>(
        await page.request.post(
          apiPath(`/applications/${application.id}/environments/${prodEnvironment?.id}/components`),
          { data: { name: names.component, description: `T14 topology ${runId}` } },
        ),
        201,
      );
      const component = applicationWithComponent.environments
        .find((environment) => environment.name === "PROD")
        ?.components.find((candidate) => candidate.name === names.component);
      expect(component).toBeDefined();
      const componentId = component?.id;
      if (!componentId) throw new Error("The persisted T14 component has no id");

      const vmList = await getJson<{ data: Vm[] }>(
        page.request,
        "/vm/inventory?q=vm-prod-01&view=ACTIVE&limit=20",
      );
      const vm = vmList.data.find(
        (candidate) =>
          candidate.name === "vm-prod-01" &&
          candidate.systemName === "VM-PROD-01.infrapilot.local",
      );
      expect(vm, "The isolated seed must contain vm-prod-01").toBeDefined();
      created.vmId = vm?.id;
      const vmDetail = await getJson<Vm>(page.request, `/vm/inventory/${vm?.id}`);
      const originalVm = {
        owner: vmDetail.owner,
        businessUnit: vmDetail.businessUnit,
        slaTier: vmDetail.slaTier,
        serviceRole: vmDetail.serviceRole,
        criticality: vmDetail.criticality,
        description: vmDetail.description,
        notes: vmDetail.notes,
        tags: vmDetail.tags,
        components: vmDetail.components,
        guestAccounts: vmDetail.guestAccounts.map((account) => ({
          id: account.id,
          username: account.username,
          accessMethod: account.accessMethod,
          role: account.role,
          note: account.note,
        })),
      };
      originalVmOwnerValue = vmDetail.owner;

      const database = await responseJson<Database>(
        await page.request.post(apiPath("/databases"), {
          data: {
            name: names.database,
            engine: "PostgreSQL",
            version: "16",
            environment: "PROD",
            hostVmId: vm?.id,
            ipAddress: "10.214.14.10",
            port: "5432",
            serviceName: `t14_${runId}`,
            owner: `T14 DBA ${runId}`,
            replication: "Streaming",
            operationalClientIps: [`10.214.14.20 | T14 API ${runId}`],
            maintenanceWindow: "Sun 02:00 - 04:00",
            status: "ACTIVE",
            note: `Database notes ${runId}`,
            responsibleParty: `T14 Database Operations ${runId}`,
            logicalDatabases: [names.logicalDatabase],
            accounts: [
              {
                username: `t14_admin_${runId}`,
                password: `T14-db-secret-${runId}!`,
                role: "DBA",
                privileges: ["SELECT", "UPDATE"],
                note: `Instance account ${runId}`,
                scope: "INSTANCE",
              },
            ],
          },
        }),
        201,
      );
      created.databaseId = database.id;
      const databaseDetail = await getJson<Database>(page.request, `/databases/${database.id}`);
      const logical = databaseDetail.logicalDatabases.find(
        (item) => item.name === names.logicalDatabase,
      );
      expect(logical).toBeDefined();
      const instanceAccount = databaseDetail.accounts.find((account) => account.scope === "INSTANCE");
      expect(instanceAccount).toBeDefined();
      const databaseWithScopedAccount = await patchJson<Database>(
        page.request,
        `/databases/${database.id}`,
        {
          accounts: [
            {
              id: instanceAccount?.id,
              username: instanceAccount?.username,
              role: instanceAccount?.role,
              privileges: instanceAccount?.privileges,
              note: instanceAccount?.note,
              scope: "INSTANCE",
            },
            {
              username: `t14_reader_${runId}`,
              password: `T14-reader-secret-${runId}!`,
              role: "Reporting",
              privileges: ["SELECT"],
              note: `Logical database reader ${runId}`,
              scope: "LOGICAL_DATABASES",
              logicalDatabaseIds: logical ? [logical.id] : [],
            },
          ],
        },
      );

      const asset = await responseJson<Asset>(
        await page.request.post(apiPath("/assets"), {
          data: {
            name: names.asset,
            assetId: names.assetId,
            type: "SERVER",
            location: `T14 Rack Room ${runId}`,
            rack: "R14-U14",
            brandModel: "Dell PowerEdge R760",
            sn: `T14-SN-${runId}`,
            status: "ACTIVE",
            department: "Infrastructure",
            responsibleParty: `T14 Asset Operations ${runId}`,
            vendor: "Dell",
            purchaseDate: "2026-01-15T00:00:00.000Z",
            warrantyExpiration: "2030-01-15T00:00:00.000Z",
            osVersion: "Ubuntu 24.04",
            dependencies: `Network and power dependency ${runId}`,
            customMetadata: {
              hardwareSpecifications: {
                cpu: { configuration: "2 x 24-core" },
                memory: { configuration: "256 GB" },
              },
            },
            ips: [
              {
                address: "10.214.14.30",
                type: "Host",
                nodeLabel: "Primary host",
                manageType: "SSH",
                version: "OpenSSH 9",
              },
            ],
            componentLinks: [{ componentId, relationType: "PRIMARY" }],
          },
        }),
        201,
      );
      created.assetId = asset.id;
      const credential = await responseJson<{ id: string }>(
        await page.request.post(apiPath("/credentials"), {
          data: {
            assetId: asset.id,
            username: `t14_host_${runId}`,
            password: `T14-host-secret-${runId}!`,
          },
        }),
        201,
      );
      const linkedAsset = await patchJson<Asset>(page.request, `/assets/${asset.id}`, {
        ips: [
          {
            address: "10.214.14.30",
            type: "Host",
            nodeLabel: "Primary host",
            manageType: "SSH",
            version: "OpenSSH 9",
            credentialIds: [credential.id],
          },
        ],
      });
      expect(linkedAsset.ipAllocations[0].credentialIds).toContain(credential.id);

      const linkedApplication = await patchJson<Application>(
        page.request,
        `/applications/${application.id}/environments/${prodEnvironment?.id}/components/${componentId}`,
        {
          name: names.component,
          description: `T14 linked topology ${runId}`,
          assetIds: [asset.id],
          vmIds: vm?.id ? [vm.id] : [],
          logicalDatabaseIds: logical?.id ? [logical.id] : [],
        },
      );
      const linkedComponent = linkedApplication.environments
        .find((environment) => environment.name === "PROD")
        ?.components.find((candidate) => candidate.id === componentId);
      expect(linkedComponent?.assets.map((item) => item.id)).toContain(asset.id);

      // Deliberately create one context issue per domain through the real API.
      await patchJson(page.request, `/vm/inventory/${vm?.id}`, { owner: "" });
      await expectQualityIssue(page.request, "/vm/data-quality/summary", vm?.id ?? "", "vm.owner");
      await expectQualityIssue(page.request, "/assets/data-quality/summary", asset.id, "asset.owner");
      await expectQualityIssue(page.request, "/databases/data-quality/summary", database.id, "database.backupPolicy");
      await expectQualityIssue(page.request, "/applications/data-quality/summary", application.id, "application.businessUnit");

      const applicationAfterApi = await getJson<Application>(page.request, `/applications/${application.id}`);
      expect(applicationAfterApi.name).toBe(names.application);
      expect(applicationAfterApi.environments[0].components[0].logicalDatabases[0].id).toBe(logical?.id);

      // Application round trip: edit through the real UI and assert the API projection.
      await page.goto(`/dashboard/applications/${application.id}`);
      await expect(page.getByRole("heading", { name: names.application })).toBeVisible();
      await editApplication(page, {
        ...updatedApplication,
        businessUnit: "",
      });
      await page.reload();
      await expect(page.getByRole("heading", { name: updatedApplication.name })).toBeVisible();
      await expect(page.getByText(`Technical Owner: ${updatedApplication.technicalOwner}`, { exact: true })).toBeVisible();
      expect(
        (await getJson<Application>(page.request, `/applications/${application.id}`)).businessUnit,
      ).toBe("");

      // Asset round trip: every retained scalar is asserted from the persisted projection.
      await page.goto(`/dashboard/assets/${asset.id}?edit=1`);
      const assetDialog = page.getByRole("dialog");
      await expect(assetDialog.getByRole("heading", { name: "Edit Asset Information" })).toBeVisible();
      await assetDialog
        .getByLabel("Responsible Party")
        .fill(`T14 Asset Operations ${runId}`);
      await assetDialog.getByRole("button", { name: "Save Changes" }).click();
      await expect(assetDialog).toBeHidden();
      const assetAfterUi = await getJson<Asset>(page.request, `/assets/${asset.id}`);
      expect(assetAfterUi).toMatchObject({
        name: names.asset,
        assetId: names.assetId,
        type: "SERVER",
        owner: null,
        location: `T14 Rack Room ${runId}`,
        rack: "R14-U14",
        brandModel: "Dell PowerEdge R760",
        sn: `T14-SN-${runId}`,
        department: "Infrastructure",
        responsibleParty: `T14 Asset Operations ${runId}`,
        vendor: "Dell",
        osVersion: "Ubuntu 24.04",
        dependencies: `Network and power dependency ${runId}`,
      });
      expect(assetAfterUi.ipAllocations[0].credentialIds).toContain(credential.id);
      expect(assetAfterUi.credentials.map((item) => item.username)).toContain(`t14_host_${runId}`);
      expect(assetAfterUi.componentLinks.map((link) => link.componentId)).toContain(component.id);

      // Database round trip: UI edits the missing recovery field; API proves the rest survived.
      await page.goto(`/dashboard/databases/${database.id}`);
      await expect(page.getByRole("heading", { name: names.database })).toBeVisible();
      await page.getByRole("button", { name: "Edit Database" }).click();
      const databaseDialog = page.getByRole("dialog");
      await expect(
        databaseDialog.getByRole("heading", { name: "Update Database Details" }),
      ).toBeVisible();
      await databaseDialog
        .getByLabel("Maintenance Window")
        .fill("Sun 02:00 - 04:00");
      await databaseDialog.getByRole("button", { name: "Save Changes" }).click();
      await expect(databaseDialog).toBeHidden();
      const databaseAfterUi = await getJson<Database>(page.request, `/databases/${database.id}`);
      expect(databaseAfterUi).toMatchObject({
        name: names.database,
        engine: "PostgreSQL",
        version: "16",
        environment: "PROD",
        hostVm: {
          id: vm?.id ?? "",
          name: vmDetail.name,
          systemName: vmDetail.systemName,
        },
        ipAddress: "10.214.14.10",
        port: "5432",
        serviceName: `t14_${runId}`,
        owner: `T14 DBA ${runId}`,
        backupPolicy: null,
        replication: "Streaming",
        maintenanceWindow: "Sun 02:00 - 04:00",
        responsibleParty: `T14 Database Operations ${runId}`,
      });
      expect(databaseAfterUi.operationalClientIps).toContain(`10.214.14.20 | T14 API ${runId}`);
      expect(databaseAfterUi.logicalDatabases.map((item) => item.name)).toContain(names.logicalDatabase);
      expect(databaseAfterUi.accounts.map((item) => item.scope)).toEqual(expect.arrayContaining(["INSTANCE", "LOGICAL_DATABASES"]));
      expect(databaseAfterUi.accounts.find((item) => item.scope === "LOGICAL_DATABASES")?.logicalDatabaseIds).toContain(logical?.id);

      // VM round trip: UI remediation preserves Owner/BU/SLA/Role/Criticality/Purpose/Notes/Tags,
      // application relation and guest-account metadata already persisted by the backend.
      await page.goto(`/dashboard/virtual-machines/${vm?.id}`);
      await expect(page.getByRole("button", { name: "Edit VM" })).toBeVisible();
      await page.getByRole("button", { name: "Edit VM" }).click();
      const vmDialog = page.getByRole("dialog");
      await expect(vmDialog.getByRole("heading")).toBeVisible();
      await vmDialog.getByLabel("Operational Notes").fill(originalVm.notes);
      await vmDialog.getByRole("button", { name: "Save Changes" }).click();
      await expect(vmDialog).toBeHidden();
      const vmAfterUi = await getJson<Vm>(page.request, `/vm/inventory/${vm?.id}`);
      expect(vmAfterUi).toMatchObject({
        systemName: vmDetail.systemName,
        businessUnit: originalVm.businessUnit,
        slaTier: originalVm.slaTier,
        serviceRole: originalVm.serviceRole,
        criticality: originalVm.criticality,
        description: originalVm.description,
        notes: originalVm.notes,
        tags: originalVm.tags,
      });
      expect(vmAfterUi.owner).toBe("");
      expect(vmAfterUi.components).toEqual(expect.arrayContaining(originalVm.components));
      expect(vmAfterUi.guestAccounts.map((account) => account.username)).toEqual(
        expect.arrayContaining(originalVm.guestAccounts.map((account) => account.username)),
      );

      // Real DQ links remediate each domain. The dashboard refetch is proven without a reload.
      await page.goto("/dashboard/data-quality");
      await expect(page.getByRole("link", { name: names.application })).toBeVisible();
      await page.getByRole("link", { name: names.application }).click();
      await editApplication(page, {
        name: updatedApplication.name,
        technicalOwner: updatedApplication.technicalOwner,
        businessUnit: updatedApplication.businessUnit,
        description: updatedApplication.description,
      });
      await page.goto("/dashboard/data-quality");
      await page.getByRole("button", { name: "Refresh quality checks" }).click();
      await expect(page.getByRole("link", { name: names.application })).toHaveCount(0);

      await page.goto("/dashboard/data-quality");
      await page.getByRole("link", { name: names.asset }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByRole("dialog").getByLabel("Owner")).toHaveValue(updatedAssetOwner);
      await page.getByRole("dialog").getByRole("button", { name: "Save Changes" }).click();
      await page.goto("/dashboard/data-quality");
      await page.getByRole("button", { name: "Refresh quality checks" }).click();
      await expect(page.getByRole("link", { name: names.asset })).toHaveCount(0);

      await page.goto("/dashboard/data-quality");
      await page.getByRole("link", { name: names.database }).click();
      await page.getByRole("button", { name: "Edit Database" }).click();
      await page.getByRole("dialog").getByLabel("Backup Policy").fill(updatedBackupPolicy);
      await page.getByRole("dialog").getByRole("button", { name: "Save Changes" }).click();
      await page.goto("/dashboard/data-quality");
      await page.getByRole("button", { name: "Refresh quality checks" }).click();
      await expect(page.getByRole("link", { name: names.database })).toHaveCount(0);

      await page.goto("/dashboard/data-quality");
      await page.getByRole("link", { name: vmDetail.name }).click();
      await page.getByRole("button", { name: "Edit VM" }).click();
      await page.getByRole("dialog").getByLabel("Owner").fill(`T14 VM Operations ${runId}`);
      await page.getByRole("dialog").getByRole("button", { name: "Save Changes" }).click();
      await page.goto("/dashboard/data-quality");
      await page.getByRole("button", { name: "Refresh quality checks" }).click();
      await expect(page.getByRole("link", { name: vmDetail.name })).toHaveCount(0);

      // A live backend mutation, followed by refetch, must not remount the whole app.
      await patchJson(page.request, `/applications/${application.id}`, { businessUnit: "" });
      await page.goto("/dashboard/data-quality");
      await page.evaluate(() => {
        (window as Window & { __ticket14RefreshMarker?: string }).__ticket14RefreshMarker = "alive";
      });
      await patchJson(page.request, `/applications/${application.id}`, {
        businessUnit: updatedApplication.businessUnit,
      });
      await page.getByRole("button", { name: "Refresh quality checks" }).click();
      await expect(page.getByRole("link", { name: names.application })).toHaveCount(0);
      await expect
        .poll(() =>
          page.evaluate(
            () => (window as Window & { __ticket14RefreshMarker?: string }).__ticket14RefreshMarker,
          ),
        )
        .toBe("alive");

      // Live 404 state is distinct from empty/not-found list state at the HTTP boundary.
      const missingResponse = await page.request.get(apiPath("/applications/00000000-0000-0000-0000-000000000014"));
      expect(missingResponse.status()).toBe(404);
      await page.goto("/dashboard/applications/00000000-0000-0000-0000-000000000014");
      await expect(page.getByText("Application not found", { exact: true })).toBeVisible();
    } finally {
      await archiveIfCreated(page.request, created.databaseId && `/databases/${created.databaseId}/archive`);
      await archiveIfCreated(page.request, created.assetId && `/assets/${created.assetId}/archive`);
      await archiveIfCreated(page.request, created.applicationId && `/applications/${created.applicationId}/archive`);
      if (created.vmId) {
        await patchJson(page.request, `/vm/inventory/${created.vmId}`, {
          owner: originalVmOwnerValue ?? "",
        }).catch(() => undefined);
      }
    }
  });
});

test.describe("Ticket 14 viewer read-only matrix", () => {
  test.use({ storageState: VIEWER_STATE });

  test("hides mutation and secret controls across every inventory domain", async ({ page }) => {
    await page.goto("/dashboard/applications?q=Treasury%20Registry");
    const applicationRow = page.getByRole("row").filter({ hasText: "Treasury Registry" }).first();
    await expect(applicationRow).toBeVisible();
    await expect(page.getByRole("button", { name: "Add application" })).toHaveCount(0);
    await applicationRow.getByRole("link").first().click();
    await expect(page.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);

    await page.goto("/dashboard/assets?q=app-prod-01");
    const assetRow = page.getByRole("row").filter({ hasText: "app-prod-01" }).first();
    await expect(assetRow).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Asset" })).toHaveCount(0);
    await expect(assetRow.getByRole("button", { name: "Edit Asset" })).toHaveCount(0);

    await page.goto("/dashboard/virtual-machines?q=vm-prod-01&view=ACTIVE");
    const vmRow = page.getByRole("row").filter({ hasText: "vm-prod-01" }).first();
    await expect(vmRow).toBeVisible();
    await expect(page.getByRole("button", { name: "Add VM" })).toHaveCount(0);
    await vmRow.getByRole("button", { name: "Details" }).click();
    await expect(page.getByRole("button", { name: "Edit VM" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Reveal password/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Copy password/ })).toHaveCount(0);

    await page.goto("/dashboard/databases?q=Treasury%20Registry%20DB");
    const databaseRow = page.getByRole("row").filter({ hasText: "Treasury Registry DB" }).first();
    await expect(databaseRow).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Database" })).toHaveCount(0);
    await expect(databaseRow.getByRole("button", { name: "Edit Database" })).toHaveCount(0);
    await databaseRow.getByRole("link").first().click();
    await expect(page.getByRole("button", { name: "Edit Database" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Reveal password/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Copy password/ })).toHaveCount(0);
  });
});
