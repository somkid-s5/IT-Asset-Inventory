import { expect, test } from "@playwright/test";

const admin = {
  id: "document-relation-admin",
  username: "document-relation-admin@example.test",
  displayName: "Document Relation Admin",
  role: "ADMIN",
  mustChangePassword: false,
};

const linkedDocument = {
  id: "document-11",
  title: "Operations runbook",
  content: "# Runbook",
  categoryId: "category-1",
  category: { id: "category-1", name: "Operations", icon: "book" },
  authorId: admin.id,
  author: { id: admin.id, displayName: admin.displayName, avatarSeed: "seed" },
  viewCount: 0,
  createdAt: "2026-09-08T00:00:00.000Z",
  updatedAt: "2026-09-08T00:00:00.000Z",
  applicationLinks: [{ application: { id: "application-1", name: "Payments" } }],
  assetLinks: [
    { asset: { id: "asset-archived", name: "Archived asset", assetId: "INV-ARCHIVED" } },
  ],
  vmLinks: [{ vm: { id: "vm-1001", systemName: "system-1001", primaryIp: "10.0.0.1001" } }],
  databaseLinks: [{ database: { id: "database-201", name: "Database 201", engine: "PostgreSQL" } }],
};

test.describe("Ticket 11 document relation search", () => {
  test("uses the shared picker for all document relation kinds and preserves selected history", async ({
    page,
  }) => {
    await page.addInitScript((snapshot) => {
      window.localStorage.setItem("user", JSON.stringify(snapshot));
    }, admin);
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: admin }),
      });
    });
    await page.route("**/api/knowledge-base/categories", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ id: "category-1", name: "Operations" }]),
      });
    });
    let patchPayload: Record<string, unknown> | undefined;
    await page.route("**/api/knowledge-base/documents/document-11", async (route) => {
      if (route.request().method() === "PATCH") {
        patchPayload = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(linkedDocument),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(linkedDocument),
      });
    });

    const attempts = new Map<string, number>();
    await page.route("**/api/relation-options**", async (route) => {
      const url = new URL(route.request().url());
      const kind = url.searchParams.get("kind") ?? "";
      const search = url.searchParams.get("q") ?? "";
      const selectedIds = (url.searchParams.get("selectedIds") ?? "")
        .split(",")
        .filter(Boolean);
      const attemptKey = `${kind}:${search}`;
      const attempt = (attempts.get(attemptKey) ?? 0) + 1;
      attempts.set(attemptKey, attempt);

      if (kind === "databases" && search === "unavailable" && attempt <= 4) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ message: "relation service unavailable" }),
        });
        return;
      }

      const items = {
        applications: {
          id: "application-1",
          label: "Payments",
          metadata: "ACTIVE",
          lifecycle: "ACTIVE",
          archived: false,
        },
        assets: {
          id: "asset-archived",
          label: "Archived asset",
          metadata: "INV-ARCHIVED · SERVER · PROD",
          lifecycle: "ARCHIVED",
          archived: true,
        },
        vms: {
          id: "vm-1001",
          label: "system-1001",
          metadata: "10.0.0.1001 · TEST",
          lifecycle: "ACTIVE",
          archived: false,
        },
        databases: {
          id: "database-201",
          label: "Database 201",
          metadata: "PostgreSQL · UAT",
          lifecycle: "ACTIVE",
          archived: false,
        },
      } as const;
      const item = items[kind as keyof typeof items];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          kind,
          items: item && !item.archived ? [item] : [],
          selectedItems: item && selectedIds.includes(item.id) ? [item] : [],
          total: item && !item.archived ? 1 : 0,
          page: 1,
          pageSize: 25,
          hasMore: false,
          nextCursor: null,
        }),
      });
    });

    await page.goto("/dashboard/docs/document-11/edit");
    await expect(page.getByRole("heading", { name: "Edit Document" })).toBeVisible();

    await expect(page.getByRole("group", { name: "Applications" }).getByText("Payments", { exact: true })).toBeVisible();
    await expect(page.getByRole("group", { name: "Assets" }).getByText("Archived asset", { exact: true })).toBeVisible();
    await expect(page.getByRole("group", { name: "Assets" }).getByText("Archived", { exact: true })).toBeVisible();
    await expect(page.getByRole("group", { name: "Virtual machines" }).getByText("system-1001", { exact: true })).toBeVisible();

    const databases = page.getByRole("group", { name: "Databases" });
    await expect(databases.getByText("Database 201", { exact: true })).toBeVisible();
    await databases.getByRole("textbox", { name: "Search Databases" }).fill("unavailable");
    await expect(databases.getByRole("alert")).toHaveAttribute("data-query-state", "error", { timeout: 15000 });
    await expect(databases.getByRole("button", { name: "Retry" })).toBeVisible();
    await expect(databases.getByText("No matching databases", { exact: true })).toHaveCount(0);
    await databases.getByRole("button", { name: "Retry" }).click();
    await expect(databases.getByText("Database 201", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page).toHaveURL(/\/dashboard\/docs\/document-11$/);
    expect(patchPayload?.applicationIds).toEqual(["application-1"]);
    expect(patchPayload?.assetIds).toEqual(["asset-archived"]);
    expect(patchPayload?.vmIds).toEqual(["vm-1001"]);
    expect(patchPayload?.databaseIds).toEqual(["database-201"]);
    await expect(page.getByRole("heading", { name: "Related inventory" })).toBeVisible();
    await expect(page.locator('a[href="/dashboard/applications/application-1"]')).toHaveCount(1);
    await expect(page.locator('a[href="/dashboard/assets/asset-archived"]')).toHaveCount(1);
    await expect(page.locator('a[href="/dashboard/virtual-machines/vm-1001"]')).toHaveCount(1);
    await expect(page.locator('a[href="/dashboard/databases/database-201"]')).toHaveCount(1);
  });

  test("can reach document link records beyond historical asset, database, and VM caps", async ({
    page,
  }) => {
    await page.addInitScript((snapshot) => {
      window.localStorage.setItem("user", JSON.stringify(snapshot));
    }, admin);
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: admin }),
      });
    });
    await page.route("**/api/knowledge-base/categories", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ id: "category-1", name: "Operations" }]),
      });
    });
    await page.route("**/api/relation-options**", async (route) => {
      const url = new URL(route.request().url());
      const kind = url.searchParams.get("kind") ?? "";
      const pageNumber = Number(url.searchParams.get("page") ?? "1");
      const boundary = {
        applications: { id: "application-1", label: "Payments", total: 1, lastPage: 1 },
        assets: { id: "asset-201", label: "Asset 201", total: 201, lastPage: 9 },
        vms: { id: "vm-1001", label: "system-1001", total: 1001, lastPage: 41 },
        databases: { id: "database-201", label: "Database 201", total: 201, lastPage: 9 },
      }[kind as "applications" | "assets" | "vms" | "databases"];
      const item = boundary && pageNumber === boundary.lastPage
        ? {
            id: boundary.id,
            label: boundary.label,
            metadata: "boundary record",
            lifecycle: "ACTIVE",
            archived: false,
          }
        : null;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          kind,
          items: item ? [item] : [{ id: `${kind}-${pageNumber}`, label: `${kind} page ${pageNumber}`, metadata: null, lifecycle: "ACTIVE", archived: false }],
          selectedItems: [],
          total: boundary?.total ?? 0,
          page: pageNumber,
          pageSize: 25,
          hasMore: Boolean(boundary && pageNumber < boundary.lastPage),
          nextCursor: null,
        }),
      });
    });

    await page.goto("/dashboard/docs/new");
    await expect(page.getByRole("heading", { name: "Write Documentation" })).toBeVisible();

    const boundaryPages = [
      ["Assets", 9, "Asset 201"],
      ["Databases", 9, "Database 201"],
      ["Virtual machines", 41, "system-1001"],
    ] as const;
    for (const [label, lastPage, record] of boundaryPages) {
      const group = page.getByRole("group", { name: label });
      for (let currentPage = 2; currentPage <= lastPage; currentPage += 1) {
        await group.getByRole("button", { name: `Next ${label} page` }).click();
      }
      await expect(group.getByText(record, { exact: true })).toBeVisible();
      const checkbox = group.getByRole("checkbox", { name: `Select ${record}` });
      await checkbox.check();
      await expect(checkbox).toBeChecked();
    }
  });
});
