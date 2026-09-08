import { expect, test } from "@playwright/test";

const admin = {
  id: "ticket-12-admin",
  username: "ticket-12-admin",
  displayName: "Ticket 12 Admin",
  avatarSeed: "ticket-12-admin",
  role: "ADMIN",
  mustChangePassword: false,
};

const users = [
  {
    id: admin.id,
    username: admin.username,
    displayName: admin.displayName,
    avatarSeed: admin.avatarSeed,
    role: "ADMIN",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "ticket-12-editor",
    username: "ticket-12-editor",
    displayName: "Ticket 12 Editor",
    avatarSeed: "ticket-12-editor",
    role: "EDITOR",
    createdAt: "2026-09-02T00:00:00.000Z",
    updatedAt: "2026-09-02T00:00:00.000Z",
  },
];

const overview = {
  assets: { total: 7, active: 5, nonActive: 2, eolCount: 1 },
  vm: {
    sources: 2,
    healthySources: 1,
    connectionFailedSources: 1,
    readyToSyncSources: 0,
    pendingSetup: 0,
    activeInventory: 12,
    orphaned: 1,
    latestSyncAt: "2026-09-08T08:00:00.000Z",
  },
  databases: { total: 4, production: 2, accounts: 9 },
  applications: { total: 5, active: 3, archived: 2 },
  recentlyUpdated: [],
};

const quality = {
  issueCount: 0,
  issues: [],
  operationalIssueCount: 0,
  operationalIssues: [],
};

function installAuth(page: import("@playwright/test").Page) {
  return page.addInitScript((snapshot) => {
    window.localStorage.setItem("user", JSON.stringify(snapshot));
  }, admin);
}

async function mockAuth(page: import("@playwright/test").Page) {
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: admin }),
    });
  });
}

test.describe("V1.1 Ticket 12 Users, Audit, Dashboard contracts", () => {
  test("Users has no unsupported selection state and uses privileged action dialogs", async ({
    page,
  }) => {
    await installAuth(page);
    await mockAuth(page);
    await page.route("**/api/users", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(users),
      });
    });

    await page.goto("/dashboard/users");
    await expect(
      page.getByRole("heading", { name: "System Access & User Directory" }),
    ).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(0);

    await page
      .getByRole("button", { name: "Actions for Ticket 12 Editor" })
      .click();
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
    await expect(
      page.getByRole("heading", { name: "Change Role" }),
    ).toBeVisible();
    await expect(page.getByText("Role changes are audited.")).toBeVisible();
  });

  test("Users request failures remain an explicit retry state", async ({
    page,
  }) => {
    await installAuth(page);
    await mockAuth(page);
    let usersAvailable = false;
    await page.route("**/api/users", async (route) => {
      if (!usersAvailable) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "users unavailable" }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(users),
      });
    });

    await page.goto("/dashboard/users");
    await expect(
      page.getByRole("alert").filter({ hasText: "Inventory unavailable" }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("row", { name: /Ticket 12 Editor/ }),
    ).toHaveCount(0);

    usersAvailable = true;
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(
      page.getByRole("row", { name: /Ticket 12 Editor/ }),
    ).toBeVisible();
  });

  test("Audit searches and paginates the server dataset beyond row 100", async ({
    page,
  }) => {
    await installAuth(page);
    await mockAuth(page);
    const requests: URL[] = [];
    await page.route("**/api/audit-logs**", async (route) => {
      const url = new URL(route.request().url());
      requests.push(url);
      const requestedPage = Number(url.searchParams.get("page") ?? "1");
      const requestedLimit = Number(url.searchParams.get("limit") ?? "20");
      const requestedSearch = url.searchParams.get("search");
      const requestedAction = url.searchParams.get("action");
      const oldEvent =
        requestedPage === 3
          ? [
              {
                id: "audit-201",
                action: "ARCHIVE_SOURCE",
                targetId: "source-201",
                ipAddress: null,
                details: '{"password":"[REDACTED]","source":"vc-old"}',
                timestamp: "2026-01-01T00:00:00.000Z",
                user: null,
              },
            ]
          : [];
      const pageRecord = {
        id: `audit-page-${requestedPage}`,
        action: "UPDATE_APPLICATION",
        targetId: `application-${requestedPage}`,
        ipAddress: "10.0.0.10",
        details: '{"name":"application"}',
        timestamp: "2026-09-08T00:00:00.000Z",
        user: null,
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data:
            requestedSearch || requestedAction
              ? [oldEvent[0] ?? pageRecord]
              : [pageRecord, ...oldEvent],
          meta: {
            total: requestedSearch || requestedAction ? 1 : 201,
            page: requestedPage,
            limit: requestedLimit,
            totalPages: requestedSearch || requestedAction ? 1 : 3,
          },
          summary: {
            totalEvents: requestedSearch || requestedAction ? 1 : 201,
            todayEvents: 2,
            deleteEvents: 3,
            uniqueActors: 4,
            scope: "all events matching the current filters",
          },
        }),
      });
    });

    await page.goto("/dashboard/audit-logs");
    await expect(
      page.getByRole("heading", { name: "System Audit Logs" }),
    ).toBeVisible();
    await page.getByLabel("Rows per page").selectOption("100");
    await expect(page.getByText("Page 1 of 3")).toBeVisible();
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page.getByText("Page 2 of 3")).toBeVisible();
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page.getByText("Page 3 of 3")).toBeVisible();
    await expect(
      page.getByRole("table").getByText("Archive Source", { exact: true }),
    ).toBeVisible();

    await page
      .getByPlaceholder("Search logs by user, action, or details...")
      .fill("legacy-event");
    await expect
      .poll(() => requests.at(-1)?.searchParams.get("search"))
      .toBe("legacy-event");
    await page.getByLabel("Filter by action").selectOption("ARCHIVE_SOURCE");
    await expect
      .poll(() => requests.at(-1)?.searchParams.get("action"))
      .toBe("ARCHIVE_SOURCE");
    await expect(page.getByText("Filtered Events").locator("..")).toContainText(
      "1",
    );
  });

  test("Dashboard keeps overview errors distinct from empty data and Data Quality failures", async ({
    page,
  }) => {
    await installAuth(page);
    await mockAuth(page);
    let overviewAvailable = false;
    let qualityAvailable = true;
    await page.route("**/api/dashboard/overview", async (route) => {
      if (!overviewAvailable) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "overview unavailable" }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(overview),
      });
    });
    await page.route(
      "**/api/applications/data-quality/summary",
      async (route) => {
        if (!qualityAvailable) {
          await route.fulfill({
            status: 403,
            contentType: "application/json",
            body: JSON.stringify({ message: "quality unavailable" }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(quality),
        });
      },
    );
    for (const endpoint of ["assets", "databases", "vm"]) {
      await page.route(
        `**/api/${endpoint}/data-quality/summary`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(quality),
          });
        },
      );
    }

    await page.goto("/dashboard");
    await expect(
      page.getByRole("alert").filter({ hasText: "Inventory unavailable" }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("link", { name: /Applications:/ })).toHaveCount(
      0,
    );

    overviewAvailable = true;
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(
      page.getByRole("link", { name: "Applications: 3" }),
    ).toBeVisible();

    qualityAvailable = false;
    await page.getByRole("button", { name: "Refresh dashboard" }).click();
    await expect(
      page.getByText(
        "Data Quality could not be loaded. Refresh the dashboard to retry.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Applications: 3" }),
    ).toBeVisible();
  });
});
