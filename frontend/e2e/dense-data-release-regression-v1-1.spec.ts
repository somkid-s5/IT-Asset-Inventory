import { expect, test, type APIRequestContext } from "@playwright/test";

const ADMIN_STATE = "playwright/.auth/admin.json";
const API_BASE_URL = (
  process.env.PLAYWRIGHT_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "/api"
).replace(/\/$/, "");
const MARKER = "T16-DENSE-RELEASE";

type RelationItem = {
  id: string;
  label: string;
  metadata: string | null;
  lifecycle: string;
  archived: boolean;
};

type RelationPage = {
  items: RelationItem[];
  selectedItems: RelationItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

function apiPath(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function jsonResponse<T>(
  response: { status(): number; json(): Promise<unknown> },
  expectedStatus = 200,
) {
  expect(response.status()).toBe(expectedStatus);
  return (await response.json()) as T;
}

async function relationPage(
  request: APIRequestContext,
  kind: string,
  q: string,
  page = 1,
  pageSize = 100,
  selectedIds?: string,
) {
  return jsonResponse<RelationPage>(
    await request.get(apiPath("/relation-options"), {
      params: {
        kind,
        q,
        page,
        pageSize,
        ...(selectedIds ? { selectedIds } : {}),
      },
    }),
  );
}

test.describe("Ticket 16 dense-data release regression gate", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ storageState: ADMIN_STATE });

  test("keeps all historical boundary searches server-authoritative", async ({
    request,
  }) => {
    test.setTimeout(120_000);

    const assets = await relationPage(request, "assets", `${MARKER}-ASSET-`);
    expect(assets.total).toBe(225);
    expect(assets.page).toBe(1);
    expect(assets.pageSize).toBe(100);
    expect(assets.items).toHaveLength(100);
    expect(assets.hasMore).toBe(true);
    const assetBoundaryPage = await relationPage(
      request,
      "assets",
      `${MARKER}-ASSET-`,
      3,
    );
    expect(assetBoundaryPage.items).toHaveLength(25);
    expect(assetBoundaryPage.hasMore).toBe(false);
    const assetBoundarySearch = await relationPage(
      request,
      "assets",
      `${MARKER}-ASSET-201`,
      1,
      25,
    );
    expect(assetBoundarySearch.items.map((item) => item.label)).toContain(
      `${MARKER}-ASSET-201`,
    );

    const databases = await relationPage(
      request,
      "databases",
      `${MARKER}-DATABASE-`,
    );
    expect(databases.total).toBe(225);
    expect(databases.items).toHaveLength(100);
    expect(databases.hasMore).toBe(true);
    const databaseBoundarySearch = await relationPage(
      request,
      "databases",
      `${MARKER}-DATABASE-201`,
      1,
      25,
    );
    expect(databaseBoundarySearch.items.map((item) => item.label)).toContain(
      `${MARKER}-DATABASE-201`,
    );

    const vms = await relationPage(request, "vms", `${MARKER}-VM-`);
    expect(vms.total).toBe(1025);
    expect(vms.items).toHaveLength(100);
    expect(vms.hasMore).toBe(true);
    const vmBoundarySearch = await relationPage(
      request,
      "vms",
      `${MARKER}-VM-1001`,
      1,
      25,
    );
    const vmBoundary = vmBoundarySearch.items.find(
      (item) => item.label === `${MARKER}-VM-1001`,
    );
    expect(vmBoundary).toBeDefined();
    const selectedVm = await relationPage(
      request,
      "vms",
      "no-match-for-selected-history",
      1,
      25,
      vmBoundary?.id,
    );
    expect(selectedVm.selectedItems.map((item) => item.id)).toContain(
      vmBoundary?.id,
    );

    const vmList = await jsonResponse<{
      data: Array<{ systemName: string }>;
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasMore: boolean;
    }>(
      await request.get(apiPath("/vm/inventory"), {
        params: {
          q: `${MARKER}-VM-`,
          view: "ACTIVE",
          page: 1,
          limit: 200,
        },
      }),
    );
    expect(vmList).toMatchObject({
      total: 1025,
      page: 1,
      limit: 200,
      totalPages: 6,
      hasMore: true,
    });
    expect(vmList.data).toHaveLength(200);
    const vmBoundaryList = await jsonResponse<{
      data: Array<{ systemName: string }>;
      total: number;
    }>(
      await request.get(apiPath("/vm/inventory"), {
        params: { q: `${MARKER}-VM-1001`, view: "ACTIVE", page: 1, limit: 20 },
      }),
    );
    expect(vmBoundaryList.total).toBe(1);
    expect(vmBoundaryList.data[0]?.systemName).toBe(`${MARKER}-VM-1001`);

    const discoveries = await jsonResponse<{
      data: Array<{ systemName: string }>;
      total: number;
      totalPages: number;
      hasMore: boolean;
    }>(
      await request.get(apiPath("/vm/discoveries"), {
        params: {
          q: `${MARKER}-DISCOVERY-`,
          view: "PENDING",
          page: 1,
          limit: 200,
        },
      }),
    );
    expect(discoveries).toMatchObject({
      total: 1025,
      totalPages: 6,
      hasMore: true,
    });
    expect(discoveries.data).toHaveLength(200);
    const discoveryBoundary = await jsonResponse<{
      data: Array<{ systemName: string }>;
      total: number;
    }>(
      await request.get(apiPath("/vm/discoveries"), {
        params: {
          q: `${MARKER}-DISCOVERY-1001`,
          view: "PENDING",
          page: 1,
          limit: 20,
        },
      }),
    );
    expect(discoveryBoundary.total).toBe(1);
    expect(discoveryBoundary.data[0]?.systemName).toBe(
      `${MARKER}-DISCOVERY-1001`,
    );

    const auditPageOne = await jsonResponse<{
      data: Array<{ details: string | null }>;
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(
      await request.get(apiPath("/audit-logs"), {
        params: {
          search: `${MARKER}-AUDIT-`,
          page: 1,
          limit: 100,
          sortBy: "timestamp",
          sortDir: "desc",
        },
      }),
    );
    expect(auditPageOne.meta).toMatchObject({
      total: 125,
      page: 1,
      limit: 100,
      totalPages: 2,
    });
    expect(auditPageOne.data).toHaveLength(100);
    const auditPageTwo = await jsonResponse<{
      data: Array<{ details: string | null }>;
      meta: { total: number; page: number; totalPages: number };
    }>(
      await request.get(apiPath("/audit-logs"), {
        params: {
          search: `${MARKER}-AUDIT-`,
          page: 2,
          limit: 100,
          sortBy: "timestamp",
          sortDir: "desc",
        },
      }),
    );
    expect(auditPageTwo.meta).toMatchObject({
      total: 125,
      page: 2,
      totalPages: 2,
    });
    expect(auditPageTwo.data.map((item) => item.details)).toContain(
      `${MARKER}-AUDIT-001`,
    );
    const oldAuditSearch = await jsonResponse<{
      data: Array<{ details: string | null }>;
      meta: { total: number };
    }>(
      await request.get(apiPath("/audit-logs"), {
        params: { search: `${MARKER}-AUDIT-001`, page: 1, limit: 20 },
      }),
    );
    expect(oldAuditSearch.meta.total).toBe(1);
    expect(oldAuditSearch.data[0]?.details).toBe(`${MARKER}-AUDIT-001`);
  });

  test("selects Asset, Database, and VM boundary records in the real Document editor", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const categoryResponse = await page.request.get(
      apiPath("/knowledge-base/categories"),
    );
    const categories =
      await jsonResponse<Array<{ id: string; name: string }>>(categoryResponse);
    const category = categories.find((item) => item.name === "General");
    expect(category).toBeDefined();

    const title = `${MARKER} persistence picker ${Date.now()}`;
    const createResponse = await page.request.post(
      apiPath("/knowledge-base/documents"),
      {
        data: {
          title,
          content: "Ticket 16 synthetic boundary document.",
          categoryId: category?.id,
        },
      },
    );
    const document = await jsonResponse<{ id: string }>(createResponse, 201);

    try {
      await page.goto(`/dashboard/docs/${document.id}/edit`);
      await expect(
        page.getByRole("heading", { name: "Edit Document" }),
      ).toBeVisible();

      const selections = [
        ["Assets", "Search Assets", `${MARKER}-ASSET-201`],
        ["Databases", "Search Databases", `${MARKER}-DATABASE-201`],
        ["Virtual machines", "Search Virtual machines", `${MARKER}-VM-1001`],
      ] as const;
      for (const [groupName, inputName, recordLabel] of selections) {
        const group = page.getByRole("group", { name: groupName });
        await group.getByRole("textbox", { name: inputName }).fill(recordLabel);
        const checkbox = group.getByRole("checkbox", {
          name: `Select ${recordLabel}`,
        });
        await expect(checkbox).toBeVisible();
        await checkbox.check();
        await expect(checkbox).toBeChecked();
      }

      const updateResponsePromise = page.waitForResponse((response) => {
        return (
          response.url().endsWith(`/api/knowledge-base/documents/${document.id}`) &&
          response.request().method() === "PATCH"
        );
      });
      await page.getByRole("button", { name: "Save Changes" }).click();
      const updateResponse = await updateResponsePromise;
      expect(updateResponse.status()).toBe(200);
      const updateBody = await updateResponse.json();
      expect(updateBody.assetLinks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            asset: expect.objectContaining({
              assetId: `${MARKER}-ASSET-201`,
            }),
          }),
        ]),
      );
      expect(updateBody.databaseLinks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            database: expect.objectContaining({
              name: `${MARKER}-DATABASE-201`,
            }),
          }),
        ]),
      );
      expect(updateBody.vmLinks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            vm: expect.objectContaining({
              systemName: `${MARKER}-VM-1001`,
            }),
          }),
        ]),
      );
      await expect(page).toHaveURL(
        new RegExp(`/dashboard/docs/${document.id}$`),
        { timeout: 15_000 },
      );
      await expect(
        page.getByRole("heading", { name: "Related inventory" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: new RegExp(`${MARKER}-ASSET-201`) }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", {
          name: new RegExp(`${MARKER}-DATABASE-201`),
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: new RegExp(`${MARKER}-VM-1001`) }),
      ).toBeVisible();
      await page.reload();
      await expect(
        page.getByRole("heading", { name: "Related inventory" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: new RegExp(`${MARKER}-ASSET-201`) }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", {
          name: new RegExp(`${MARKER}-DATABASE-201`),
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: new RegExp(`${MARKER}-VM-1001`) }),
      ).toBeVisible();
    } finally {
      const cleanupResponse = await page.request.delete(
        apiPath(`/knowledge-base/documents/${document.id}`),
      );
      expect([200, 204, 404]).toContain(cleanupResponse.status());
    }
  });
});
