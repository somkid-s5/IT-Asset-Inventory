import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type Page,
} from "@playwright/test";

const ADMIN_STATE = "playwright/.auth/admin.json";
const API_BASE_URL = (
  process.env.PLAYWRIGHT_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "/api"
).replace(/\/$/, "");
const DENSE_MARKER = "T16-DENSE-RELEASE";

type RelationItem = {
  id: string;
  label: string;
  metadata: string | null;
  lifecycle: string;
  archived: boolean;
};

type RelationResponse = {
  kind: string;
  items: RelationItem[];
  selectedItems: RelationItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  nextCursor: string | null;
};

type Category = { id: string; name: string };

function apiPath(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function expectJson<T>(
  response: { status(): number; text(): Promise<string> },
  expectedStatus: number,
) {
  const body = await response.text();
  expect(response.status(), body).toBe(expectedStatus);
  return JSON.parse(body) as T;
}

async function relationSearch(
  request: APIRequestContext,
  kind: string,
  q: string,
  selectedIds?: string,
) {
  return expectJson<RelationResponse>(
    await request.get(apiPath("/relation-options"), {
      params: {
        kind,
        q,
        page: 1,
        pageSize: 25,
        ...(selectedIds ? { selectedIds } : {}),
      },
    }),
    200,
  );
}

async function expectSafeRelationProjection(
  request: APIRequestContext,
  kind: string,
  q: string,
) {
  const response = await relationSearch(request, kind, q);
  expect(JSON.stringify(response)).not.toMatch(
    /credential|password|username|secret/i,
  );
  return response;
}

async function createArchivedAsset(request: APIRequestContext, runId: string) {
  const assetName = `T11 archived document asset ${runId}`;
  const assetId = `T11-ARCHIVED-${runId}`;
  const created = await expectJson<{ id: string }>(
    await request.post(apiPath("/assets"), {
      data: {
        name: assetName,
        assetId,
        type: "SERVER",
        status: "ACTIVE",
        location: "Ticket 11 acceptance fixture",
        owner: "Ticket 11 acceptance",
      },
    }),
    201,
  );
  await expectJson<Record<string, unknown>>(
    await request.patch(apiPath(`/assets/${created.id}/archive`)),
    200,
  );
  return { id: created.id, name: assetName, assetId };
}

async function createDocument(
  request: APIRequestContext,
  categoryId: string,
  archivedAssetId: string,
  runId: string,
) {
  return expectJson<{ id: string }>(
    await request.post(apiPath("/knowledge-base/documents"), {
      data: {
        title: `T11 persisted document relations ${runId}`,
        content: "# Ticket 11\n\nPersistence-backed relation picker acceptance.",
        categoryId,
        assetIds: [archivedAssetId],
      },
    }),
    201,
  );
}

async function searchAndSelect(
  page: Page,
  groupName: string,
  searchLabel: string,
  recordLabel: string,
) {
  const group = page.getByRole("group", { name: groupName });
  await group.getByRole("textbox", { name: searchLabel }).fill(recordLabel);
  const checkbox = group.getByRole("checkbox", {
    name: `Select ${recordLabel}`,
  });
  await expect(checkbox).toBeVisible({ timeout: 20_000 });
  await checkbox.check();
  await expect(checkbox).toBeChecked();
}

async function assertReverseNavigation(
  page: Page,
  documentId: string,
  documentTitle: string,
  linkName: RegExp,
  detailUrl: RegExp,
) {
  await page.getByRole("link", { name: linkName }).click();
  await expect(page).toHaveURL(detailUrl, { timeout: 20_000 });
  await expect(
    page.getByRole("link", { name: documentTitle, exact: true }),
  ).toBeVisible({ timeout: 20_000 });
  await page.goto(`/dashboard/docs/${documentId}`);
  await expect(
    page.getByRole("heading", { name: "Related inventory" }),
  ).toBeVisible({ timeout: 20_000 });
}

test.describe("Ticket 11 document relation search", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ storageState: ADMIN_STATE });

  test("persists full relation search, lifecycle history, retry, and reverse navigation", async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000);

    const runId = `${Date.now().toString(36)}-${test.info().workerIndex}`;
    const request = page.request;
    let documentId: string | undefined;
    let archivedAssetId: string | undefined;
    let publicContext: Awaited<ReturnType<Browser["newContext"]>> | undefined;

    try {
      const categories = await expectJson<Category[]>(
        await request.get(apiPath("/knowledge-base/categories")),
        200,
      );
      const category = categories.find((item) => item.name === "General");
      expect(category, "The isolated acceptance seed must contain General").toBeDefined();

      const application = await expectSafeRelationProjection(
        request,
        "applications",
        "Treasury Registry",
      );
      expect(application.items.map((item) => item.label)).toContain(
        "Treasury Registry",
      );

      const boundaryAsset = await expectSafeRelationProjection(
        request,
        "assets",
        `${DENSE_MARKER}-ASSET-201`,
      );
      expect(boundaryAsset.items.map((item) => item.label)).toContain(
        `${DENSE_MARKER}-ASSET-201`,
      );

      const boundaryVm = await expectSafeRelationProjection(
        request,
        "vms",
        `${DENSE_MARKER}-VM-1001`,
      );
      expect(boundaryVm.items.map((item) => item.label)).toContain(
        `${DENSE_MARKER}-VM-1001`,
      );

      const boundaryDatabase = await expectSafeRelationProjection(
        request,
        "databases",
        `${DENSE_MARKER}-DATABASE-201`,
      );
      expect(boundaryDatabase.items.map((item) => item.label)).toContain(
        `${DENSE_MARKER}-DATABASE-201`,
      );

      const archivedAsset = await createArchivedAsset(request, runId);
      archivedAssetId = archivedAsset.id;
      const archivedOptions = await expectSafeRelationProjection(
        request,
        "assets",
        archivedAsset.name,
      );
      expect(archivedOptions.items).toEqual([]);
      expect(archivedOptions.selectedItems).toEqual([]);
      expect(archivedOptions.total).toBe(0);

      const document = await createDocument(
        request,
        category?.id ?? "",
        archivedAsset.id,
        runId,
      );
      documentId = document.id;
      const documentTitle = `T11 persisted document relations ${runId}`;

      let transientAttempts = 0;
      const transientQuery = `T11 transient relation failure ${runId}`;
      let failTransientQuery = true;
      await page.route("**/relation-options**", async (route) => {
        const url = new URL(route.request().url());
        if (
          route.request().method() === "GET" &&
          url.pathname.endsWith("/relation-options") &&
          url.searchParams.get("kind") === "databases" &&
          url.searchParams.get("q") === transientQuery &&
          failTransientQuery
        ) {
          transientAttempts += 1;
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ message: "controlled Ticket 11 retry" }),
          });
          return;
        }
        await route.continue();
      });

      await page.goto(`/dashboard/docs/${document.id}/edit`);
      await expect(
        page.getByRole("heading", { name: "Edit Document" }),
      ).toBeVisible({ timeout: 20_000 });

      const archivedGroup = page.getByRole("group", { name: "Assets" });
      const archivedCheckbox = archivedGroup.getByRole("checkbox", {
        name: `Select ${archivedAsset.name} (Archived)`,
      });
      await expect(archivedCheckbox).toBeVisible({ timeout: 20_000 });
      await expect(archivedCheckbox).toBeChecked();
      await expect(
        archivedGroup.getByText("Archived", { exact: true }),
      ).toBeVisible();

      await searchAndSelect(
        page,
        "Applications",
        "Search Applications",
        "Treasury Registry",
      );
      await searchAndSelect(
        page,
        "Assets",
        "Search Assets",
        `${DENSE_MARKER}-ASSET-201`,
      );
      await searchAndSelect(
        page,
        "Databases",
        "Search Databases",
        `${DENSE_MARKER}-DATABASE-201`,
      );
      await searchAndSelect(
        page,
        "Virtual machines",
        "Search Virtual machines",
        `${DENSE_MARKER}-VM-1001`,
      );

      await archivedGroup
        .getByRole("textbox", { name: "Search Assets" })
        .fill("");
      await expect(
        archivedGroup.getByRole("checkbox", {
          name: `Select ${archivedAsset.name} (Archived)`,
        }),
      ).toBeChecked();
      await expect(
        archivedGroup.getByRole("checkbox", {
          name: `Select ${DENSE_MARKER}-ASSET-201`,
        }),
      ).toBeChecked();

      await archivedGroup
        .getByRole("textbox", { name: "Search Assets" })
        .fill(`T11 no-match history ${runId}`);
      await expect(
        archivedGroup.getByRole("checkbox", {
          name: `Select ${archivedAsset.name} (Archived)`,
        }),
      ).toBeChecked();
      await expect(
        archivedGroup.getByRole("checkbox", {
          name: `Select ${DENSE_MARKER}-ASSET-201`,
        }),
      ).toBeChecked();
      await expect(
        archivedGroup.getByText("No matching assets.", { exact: true }),
      ).toHaveCount(0);

      const databaseGroup = page.getByRole("group", { name: "Databases" });
      await databaseGroup
        .getByRole("textbox", { name: "Search Databases" })
        .fill(transientQuery);
      const databaseError = databaseGroup.getByRole("alert");
      await expect(databaseError).toBeVisible({ timeout: 20_000 });
      await expect(databaseError).toContainText("Inventory unavailable");
      await expect(
        databaseGroup.getByText("No matching databases.", { exact: true }),
      ).toHaveCount(0);
      failTransientQuery = false;
      await databaseError.getByRole("button", { name: "Retry" }).click();
      await expect(
        databaseGroup.getByRole("checkbox", {
          name: `Select ${DENSE_MARKER}-DATABASE-201`,
        }),
      ).toBeChecked({ timeout: 20_000 });
      expect(transientAttempts).toBeGreaterThanOrEqual(4);

      const updateResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === "PATCH" &&
          response.url().endsWith(`/api/knowledge-base/documents/${document.id}`),
      );
      await page.getByRole("button", { name: "Save Changes" }).click();
      const updateResponse = await updateResponsePromise;
      expect(updateResponse.status()).toBe(200);
      const updatedDocument = (await updateResponse.json()) as Record<
        string,
        unknown
      >;
      expect(updatedDocument.applicationLinks).toHaveLength(1);
      expect(updatedDocument.assetLinks).toHaveLength(2);
      expect(updatedDocument.vmLinks).toHaveLength(1);
      expect(updatedDocument.databaseLinks).toHaveLength(1);
      await expect(page).toHaveURL(
        new RegExp(`/dashboard/docs/${document.id}$`),
        { timeout: 20_000 },
      );

      await expect(
        page.getByRole("heading", { name: "Related inventory" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /Treasury Registry/ }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", {
          name: new RegExp(`${escapeRegExp(DENSE_MARKER)}-ASSET-201`),
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", {
          name: new RegExp(`${escapeRegExp(DENSE_MARKER)}-VM-1001`),
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", {
          name: new RegExp(`${escapeRegExp(DENSE_MARKER)}-DATABASE-201`),
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: new RegExp(escapeRegExp(archivedAsset.name)) }),
      ).toBeVisible();

      await page.reload();
      await expect(
        page.getByRole("heading", { name: "Related inventory" }),
      ).toBeVisible({ timeout: 20_000 });
      await expect(
        page.getByRole("link", { name: /Treasury Registry/ }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", {
          name: new RegExp(`${escapeRegExp(DENSE_MARKER)}-ASSET-201`),
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", {
          name: new RegExp(`${escapeRegExp(DENSE_MARKER)}-VM-1001`),
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", {
          name: new RegExp(`${escapeRegExp(DENSE_MARKER)}-DATABASE-201`),
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: new RegExp(escapeRegExp(archivedAsset.name)) }),
      ).toBeVisible();

      await assertReverseNavigation(
        page,
        document.id,
        documentTitle,
        /Treasury Registry/,
        new RegExp(`/dashboard/applications/${escapeRegExp(application.items[0]?.id ?? "")}$`),
      );
      await assertReverseNavigation(
        page,
        document.id,
        documentTitle,
        new RegExp(`${escapeRegExp(archivedAsset.name)}`),
        new RegExp(`/dashboard/assets/${escapeRegExp(archivedAsset.id)}$`),
      );
      await assertReverseNavigation(
        page,
        document.id,
        documentTitle,
        new RegExp(`${escapeRegExp(DENSE_MARKER)}-ASSET-201`),
        /\/dashboard\/assets\/[a-f0-9-]+$/i,
      );
      await assertReverseNavigation(
        page,
        document.id,
        documentTitle,
        new RegExp(`${escapeRegExp(DENSE_MARKER)}-VM-1001`),
        /\/dashboard\/virtual-machines\/[a-f0-9-]+$/i,
      );
      await assertReverseNavigation(
        page,
        document.id,
        documentTitle,
        new RegExp(`${escapeRegExp(DENSE_MARKER)}-DATABASE-201`),
        /\/dashboard\/databases\/[a-f0-9-]+$/i,
      );

      const publicResponse = await request.get(
        apiPath(`/knowledge-base/public/documents/${document.id}`),
      );
      const publicDocument = await expectJson<Record<string, unknown>>(
        publicResponse,
        200,
      );
      expect(publicDocument.applicationLinks).toBeUndefined();
      expect(publicDocument.assetLinks).toBeUndefined();
      expect(publicDocument.vmLinks).toBeUndefined();
      expect(publicDocument.databaseLinks).toBeUndefined();

      const origin = new URL(page.url()).origin;
      publicContext = await browser.newContext({
        storageState: { cookies: [], origins: [] },
        ignoreHTTPSErrors: process.env.PLAYWRIGHT_IGNORE_HTTPS_ERRORS === "true",
      });
      const publicPage = await publicContext.newPage();
      await publicPage.goto(`${origin}/docs/${document.id}`);
      await expect(
        publicPage.getByRole("heading", { name: documentTitle }),
      ).toBeVisible({ timeout: 20_000 });
      await expect(
        publicPage.getByText("Shared Knowledge Document", { exact: true }),
      ).toBeVisible();
      await expect(
        publicPage.getByText("Related inventory", { exact: true }),
      ).toHaveCount(0);
    } finally {
      await publicContext?.close();
      if (documentId) {
        const response = await request.delete(
          apiPath(`/knowledge-base/documents/${documentId}`),
        );
        expect([200, 204, 404]).toContain(response.status());
      }
      // Keep the intentionally archived fixture archived so it cannot enter a
      // later run's eligible relation-picker results.
      if (archivedAssetId) {
        const response = await request.patch(
          apiPath(`/assets/${archivedAssetId}/archive`),
        );
        expect([200, 404]).toContain(response.status());
      }
    }
  });
});
