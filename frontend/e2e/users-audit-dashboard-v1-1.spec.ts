import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const ADMIN_STATE = "playwright/.auth/admin.json";
const API_BASE_URL = (
  process.env.PLAYWRIGHT_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "/api"
).replace(/\/$/, "");

type UserRecord = {
  id: string;
  username: string;
  displayName: string;
  avatarSeed: string;
  avatarImage?: string | null;
  role: "ADMIN" | "EDITOR" | "VIEWER";
  createdAt: string;
  updatedAt: string;
};

type AuditRecord = {
  details: string | null;
  action: string;
};

type AuditPage = {
  data: AuditRecord[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

type VmSource = {
  id: string;
  status: string;
};

function apiPath(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function apiPathname(path: string) {
  const endpoint = apiPath(path);
  return /^https?:\/\//.test(endpoint)
    ? new URL(endpoint).pathname
    : endpoint.split("?", 1)[0];
}

function routeForPath(path: string) {
  return new RegExp(`${escapeRegExp(apiPathname(path))}(?:\\?.*)?$`);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function responseJson<T>(
  response: { status(): number; json(): Promise<unknown> },
  expectedStatus = 200,
) {
  expect(response.status()).toBe(expectedStatus);
  return (await response.json()) as T;
}

async function getCurrentUser(request: APIRequestContext) {
  const body = await responseJson<{
    user: Pick<UserRecord, "id" | "username" | "displayName" | "role">;
  }>(await request.get(apiPath("/auth/me")));
  return body.user;
}

async function getUsers(request: APIRequestContext) {
  return responseJson<UserRecord[]>(await request.get(apiPath("/users")));
}

async function createUser(
  request: APIRequestContext,
  username: string,
  displayName: string,
  password: string,
) {
  return responseJson<UserRecord>(
    await request.post(apiPath("/users"), {
      data: { username, displayName, password, role: "VIEWER" },
    }),
    201,
  );
}

async function deleteUser(request: APIRequestContext, userId: string) {
  const response = await request.delete(apiPath(`/users/${userId}`));
  expect([200, 404]).toContain(response.status());
}

async function createAuditExportEvents(
  request: APIRequestContext,
  marker: string,
  count: number,
) {
  for (let index = 1; index <= count; index += 1) {
    const response = await request.post(apiPath("/audit-logs/export"), {
      data: {
        resource: "ticket-12-audit",
        count: index,
        query: `${marker}-${index.toString().padStart(3, "0")}`,
      },
    });
    expect(response.status()).toBe(201);
  }
}

function auditQuery(details: string | null) {
  if (!details) return null;
  const parsed = JSON.parse(details) as { query?: unknown };
  return typeof parsed.query === "string" ? parsed.query : null;
}

async function waitForApiResponse(
  page: Page,
  path: string,
  predicate?: (url: URL) => boolean,
) {
  return page.waitForResponse((response) => {
    if (response.request().method() !== "GET") return false;
    const url = new URL(response.url());
    return (
      url.pathname === apiPathname(path) && (!predicate || predicate(url))
    );
  });
}

test.describe("V1.1 Ticket 12 Users, Audit, Dashboard contracts", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ storageState: ADMIN_STATE });

  test("Users has no unsupported selection state, privileged dialogs, and server safeguards", async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    const currentUser = await getCurrentUser(page.request);
    const username = `ticket12-${testInfo.workerIndex}-${testInfo.repeatEachIndex}-${Date.now().toString(36)}`;
    const displayName = `Ticket 12 User ${testInfo.workerIndex}-${testInfo.repeatEachIndex}`;
    const createdUser = await createUser(
      page.request,
      username,
      displayName,
      `Ticket12-${Date.now()}-Aa1`,
    );

    try {
      const selfRoleResponse = await page.request.patch(
        apiPath(`/users/${currentUser.id}/role`),
        { data: { role: "EDITOR" } },
      );
      expect(selfRoleResponse.status()).toBe(400);

      const selfDeleteResponse = await page.request.delete(
        apiPath(`/users/${currentUser.id}`),
      );
      expect(selfDeleteResponse.status()).toBe(400);

      await page.goto("/dashboard/users");
      await expect(
        page.getByRole("heading", {
          name: "System Access & User Directory",
          level: 2,
        }),
      ).toBeVisible();
      await expect(page.getByRole("checkbox")).toHaveCount(0);

      const currentUserRow = page.getByRole("row", {
        name: new RegExp(escapeRegExp(currentUser.displayName)),
      });
      await expect(currentUserRow).toBeVisible();
      await currentUserRow
        .getByRole("button", {
          name: `Actions for ${currentUser.displayName}`,
        })
        .click();
      await expect(
        page.getByRole("menuitem", { name: "Change Role" }),
      ).toBeDisabled();
      await expect(
        page.getByRole("menuitem", { name: "Delete Account" }),
      ).toBeDisabled();
      await expect(
        page.getByRole("menuitem", { name: "Reset Password" }),
      ).toBeEnabled();
      await page.keyboard.press("Escape");

      const userRow = page.getByRole("row", {
        name: new RegExp(escapeRegExp(createdUser.displayName)),
      });
      await expect(userRow).toBeVisible();
      const actions = userRow.getByRole("button", {
        name: `Actions for ${createdUser.displayName}`,
      });

      await actions.click();
      await expect(
        page.getByRole("menuitem", { name: "Change Role" }),
      ).toBeVisible();
      await expect(
        page.getByRole("menuitem", { name: "Reset Password" }),
      ).toBeVisible();
      await expect(
        page.getByRole("menuitem", { name: "Delete Account" }),
      ).toBeVisible();
      await page.getByRole("menuitem", { name: "Change Role" }).click();
      const roleDialog = page.getByRole("dialog", { name: "Change Role" });
      await expect(roleDialog).toBeVisible();
      await expect(roleDialog).toContainText("Role changes are audited.");
      await roleDialog.getByRole("button", { name: "Cancel" }).click();

      await actions.click();
      await page.getByRole("menuitem", { name: "Reset Password" }).click();
      const resetDialog = page.getByRole("dialog", { name: "Reset Password" });
      await expect(resetDialog).toBeVisible();
      await expect(resetDialog).toContainText("current password is never shown");
      await resetDialog.getByRole("button", { name: "Cancel" }).click();

      await actions.click();
      await page.getByRole("menuitem", { name: "Delete Account" }).click();
      const deleteDialog = page.getByRole("dialog", { name: "Delete User" });
      await expect(deleteDialog).toBeVisible();
      await expect(deleteDialog).toContainText("cannot target your own account");
      await deleteDialog.getByRole("button", { name: "Cancel" }).click();
    } finally {
      await deleteUser(page.request, createdUser.id);
    }
  });

  test("Users request failures remain an explicit retry state", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const currentUser = await getCurrentUser(page.request);
    const persistedUsers = await getUsers(page.request);
    const persistedTarget = persistedUsers.find(
      (user) => user.id !== currentUser.id,
    );
    expect(persistedTarget).toBeDefined();
    if (!persistedTarget) return;

    let allowUsersRetry = false;
    const usersRoute = routeForPath("/users");
    await page.route(usersRoute, async (route) => {
      if (route.request().method() === "GET" && !allowUsersRetry) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "users unavailable" }),
        });
        return;
      }
      await route.continue();
    });

    try {
      await page.goto("/dashboard/users");
      await expect(
        page.getByRole("alert").filter({ hasText: "Inventory unavailable" }),
      ).toBeVisible({ timeout: 20_000 });
      await expect(
        page.getByRole("row", {
          name: new RegExp(escapeRegExp(persistedTarget.displayName)),
        }),
      ).toHaveCount(0);

      allowUsersRetry = true;
      const retryResponse = waitForApiResponse(page, "/users");
      await page.getByRole("button", { name: "Retry" }).click();
      expect((await retryResponse).status()).toBe(200);
      await expect(
        page.getByRole("row", {
          name: new RegExp(escapeRegExp(persistedTarget.displayName)),
        }),
      ).toBeVisible();
    } finally {
      await page.unroute(usersRoute);
    }
  });

  test("Audit searches, filters, paginates the server dataset beyond row 100, and keeps detail secret-safe", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const marker = `T12-AUDIT-${testInfo.workerIndex}-${testInfo.repeatEachIndex}-${Date.now().toString(36)}`;
    await createAuditExportEvents(page.request, marker, 101);

    const sourceResponse = await page.request.get(apiPath("/vm/sources"));
    const sources = await responseJson<VmSource[]>(sourceResponse);
    const source = sources.find((candidate) => candidate.status !== "ARCHIVED");
    expect(source).toBeDefined();
    if (!source) return;

    let sourceNeedsRestore = false;
    const resetPassword = `Ticket12-${Date.now()}-Secret-Aa1`;
    const auditUserDisplayName = `Ticket 12 Audit User ${testInfo.workerIndex}-${testInfo.repeatEachIndex}-${Date.now().toString(36)}`;
    const auditUser = await createUser(
      page.request,
      `ticket12-audit-${testInfo.workerIndex}-${testInfo.repeatEachIndex}-${Date.now().toString(36)}`,
      auditUserDisplayName,
      resetPassword,
    );

    try {
      const archiveResponse = await page.request.patch(
        apiPath(`/vm/sources/${source.id}/archive`),
      );
      expect(archiveResponse.status()).toBe(200);
      sourceNeedsRestore = true;
      const restoreResponse = await page.request.patch(
        apiPath(`/vm/sources/${source.id}/restore`),
      );
      expect(restoreResponse.status()).toBe(200);
      sourceNeedsRestore = false;

      const roleResponse = await page.request.patch(
        apiPath(`/users/${auditUser.id}/role`),
        { data: { role: "EDITOR" } },
      );
      expect(roleResponse.status()).toBe(200);
      const resetResponse = await page.request.patch(
        apiPath(`/users/${auditUser.id}/reset-password`),
        { data: { password: resetPassword } },
      );
      expect(resetResponse.status()).toBe(200);

      const firstPage = await responseJson<AuditPage>(
        await page.request.get(apiPath("/audit-logs"), {
          params: {
            search: marker,
            page: 1,
            limit: 100,
            sortBy: "timestamp",
            sortDir: "desc",
          },
        }),
      );
      const secondPage = await responseJson<AuditPage>(
        await page.request.get(apiPath("/audit-logs"), {
          params: {
            search: marker,
            page: 2,
            limit: 100,
            sortBy: "timestamp",
            sortDir: "desc",
          },
        }),
      );
      expect(firstPage.meta).toMatchObject({
        total: 101,
        page: 1,
        limit: 100,
        totalPages: 2,
      });
      expect(firstPage.data).toHaveLength(100);
      expect(secondPage.meta).toMatchObject({
        total: 101,
        page: 2,
        limit: 100,
        totalPages: 2,
      });
      expect(secondPage.data).toHaveLength(1);
      const boundaryQuery = auditQuery(secondPage.data[0]?.details ?? null);
      expect(boundaryQuery).toContain(marker);
      if (!boundaryQuery) return;

      await page.goto("/dashboard/audit-logs");
      const searchInput = page.getByPlaceholder(
        "Search logs by user, action, or details...",
      );
      const markerResponse = waitForApiResponse(
        page,
        "/audit-logs",
        (url) => url.searchParams.get("search") === marker,
      );
      await searchInput.fill(marker);
      expect((await markerResponse).status()).toBe(200);
      await page.getByLabel("Rows per page").selectOption("100");
      await expect(page.getByText("101 matching events")).toBeVisible();
      await expect(page.getByText("Page 1 of 2")).toBeVisible();

      const pageTwoResponse = waitForApiResponse(
        page,
        "/audit-logs",
        (url) =>
          url.searchParams.get("search") === marker &&
          url.searchParams.get("page") === "2" &&
          url.searchParams.get("limit") === "100",
      );
      await page.getByRole("button", { name: "Next page" }).click();
      expect((await pageTwoResponse).status()).toBe(200);
      await expect(page.getByText("Page 2 of 2")).toBeVisible();
      const boundaryDetailsButton = page.getByRole("button", {
        name: new RegExp(escapeRegExp(boundaryQuery)),
      });
      await expect(boundaryDetailsButton).toBeVisible();
      await boundaryDetailsButton.click();
      const detailsDialog = page.getByRole("dialog", {
        name: "Audit Log Details",
      });
      await expect(detailsDialog).toBeVisible();
      await expect(detailsDialog).toContainText(boundaryQuery);
      await expect(detailsDialog).toContainText(
        "Secret-shaped values are redacted.",
      );
      await page.keyboard.press("Escape");

      const exactBoundaryResponse = waitForApiResponse(
        page,
        "/audit-logs",
        (url) => url.searchParams.get("search") === boundaryQuery,
      );
      await searchInput.fill(boundaryQuery);
      expect((await exactBoundaryResponse).status()).toBe(200);
      await expect(page.getByText("Page 1 of 1")).toBeVisible();
      await expect(
        page.getByRole("button", {
          name: new RegExp(escapeRegExp(boundaryQuery)),
        }),
      ).toBeVisible();

      await page.getByRole("button", { name: "Clear search" }).click();
      const actionResponse = waitForApiResponse(
        page,
        "/audit-logs",
        (url) => url.searchParams.get("action") === "ARCHIVE_SOURCE",
      );
      await page.getByLabel("Filter by action").selectOption("ARCHIVE_SOURCE");
      expect((await actionResponse).status()).toBe(200);
      await expect(
        page
          .getByRole("table")
          .getByText("Archive Source", { exact: true })
          .first(),
      ).toBeVisible();

      const secretSafeResponse = waitForApiResponse(
        page,
        "/audit-logs",
        (url) => url.searchParams.get("action") === "RESET_USER_PASSWORD",
      );
      await page
        .getByLabel("Filter by action")
        .selectOption("RESET_USER_PASSWORD");
      expect((await secretSafeResponse).status()).toBe(200);
      const resetDetailsButton = page.getByRole("button", {
        name: new RegExp(escapeRegExp(auditUser.displayName)),
      });
      await expect(resetDetailsButton).toBeVisible();
      await resetDetailsButton.click();
      const resetDetailsDialog = page.getByRole("dialog", {
        name: "Audit Log Details",
      });
      await expect(resetDetailsDialog).toBeVisible();
      await expect(resetDetailsDialog).toContainText(auditUser.displayName);
      await expect(resetDetailsDialog).not.toContainText(resetPassword);
      await expect(resetDetailsDialog).toContainText(
        "Secret-shaped values are redacted.",
      );
    } finally {
      if (sourceNeedsRestore) {
        const restoreResponse = await page.request.patch(
          apiPath(`/vm/sources/${source.id}/restore`),
        );
        expect([200, 404]).toContain(restoreResponse.status());
      }
      await deleteUser(page.request, auditUser.id);
    }
  });

  test("Dashboard separates overview and Data Quality failures and marks stale overview data", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    let allowOverviewRetry = false;
    let failOverviewRefresh = false;
    let failQualityRefresh = false;
    const overviewRoute = routeForPath("/dashboard/overview");
    const qualityRoute = routeForPath("/applications/data-quality/summary");

    await page.route(overviewRoute, async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      if (!allowOverviewRetry || failOverviewRefresh) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "overview unavailable" }),
        });
        return;
      }
      await route.continue();
    });
    await page.route(qualityRoute, async (route) => {
      if (route.request().method() === "GET" && failQualityRefresh) {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ message: "quality unavailable" }),
        });
        return;
      }
      await route.continue();
    });

    try {
      await page.goto("/dashboard");
      await expect(
        page.getByRole("alert").filter({ hasText: "Inventory unavailable" }),
      ).toBeVisible({ timeout: 20_000 });
      await expect(
        page.getByRole("link", { name: /^Applications:/ }),
      ).toHaveCount(0);

      allowOverviewRetry = true;
      const retryResponse = waitForApiResponse(page, "/dashboard/overview");
      await page.getByRole("button", { name: "Retry" }).click();
      expect((await retryResponse).status()).toBe(200);
      const applicationsCard = page.getByRole("link", {
        name: /^Applications:/,
      });
      await expect(applicationsCard).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Refresh dashboard" }),
      ).toBeEnabled();
      const overviewLabel = await applicationsCard.getAttribute("aria-label");
      expect(overviewLabel).toMatch(/^Applications:/);

      failOverviewRefresh = true;
      failQualityRefresh = true;
      const refreshOverviewResponse = waitForApiResponse(
        page,
        "/dashboard/overview",
      );
      const refreshQualityResponse = waitForApiResponse(
        page,
        "/applications/data-quality/summary",
      );
      await page.getByRole("button", { name: "Refresh dashboard" }).click();
      expect((await refreshOverviewResponse).status()).toBe(500);
      expect((await refreshQualityResponse).status()).toBe(403);
      // The browser API client retries 5xx responses before React Query exposes
      // the final stale refresh error state.
      await expect(
        page.getByRole("button", { name: "Refresh dashboard" }),
      ).toBeEnabled({ timeout: 15_000 });
      await expect(
        page.getByRole("alert").filter({ hasText: "Refresh failed" }),
      ).toBeVisible();
      await expect(
        page.getByText(
          "Data Quality could not be loaded. Refresh the dashboard to retry.",
        ),
      ).toBeVisible();
      await expect(applicationsCard).toHaveAttribute(
        "aria-label",
        overviewLabel ?? "",
      );
    } finally {
      await page.unroute(overviewRoute);
      await page.unroute(qualityRoute);
    }
  });
});
