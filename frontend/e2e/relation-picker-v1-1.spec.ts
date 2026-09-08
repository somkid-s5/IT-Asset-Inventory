import { expect, test } from "@playwright/test";

test.describe("Ticket 03 relation picker dense-data evidence", () => {
  test("selects asset 201 by paging beyond the historical 200-record cap", async ({
    page,
  }) => {
    const user = {
      id: "browser-evidence-user",
      username: "browser-evidence@example.test",
      displayName: "Browser Evidence",
      role: "ADMIN",
      mustChangePassword: false,
    };

    await page.addInitScript((snapshot) => {
      window.localStorage.setItem("user", JSON.stringify(snapshot));
    }, user);

    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user }) });
    });
    await page.route("**/api/knowledge-base/categories", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ id: "category-1", name: "Evidence" }]),
      });
    });
    await page.route("**/api/relation-options**", async (route) => {
      const url = new URL(route.request().url());
      const kind = url.searchParams.get("kind");
      const requestedPage = Number(url.searchParams.get("page") ?? "1");
      const search = url.searchParams.get("q") ?? "";
      const selectedIds = (url.searchParams.get("selectedIds") ?? "").split(",").filter(Boolean);

      if (kind !== "assets") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            kind,
            items: [],
            selectedItems: [],
            total: 0,
            page: requestedPage,
            pageSize: 25,
            hasMore: false,
            nextCursor: null,
          }),
        });
        return;
      }

      const selectedItems = selectedIds.includes("asset-201")
        ? [
            {
              id: "asset-201",
              label: "Asset 201",
              metadata: "INV-0201 · SERVER · PROD",
              lifecycle: "ACTIVE",
              archived: false,
            },
          ]
        : [];
      const isSearchingForNoMatch = search === "no-match";
      const currentItem = isSearchingForNoMatch
        ? []
        : [
            {
              id: requestedPage === 9 ? "asset-201" : `asset-page-${requestedPage}`,
              label: requestedPage === 9 ? "Asset 201" : `Asset page ${requestedPage}`,
              metadata: requestedPage === 9 ? "INV-0201 · SERVER · PROD" : "SERVER · PROD",
              lifecycle: "ACTIVE",
              archived: false,
            },
          ];

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          kind,
          items: currentItem,
          selectedItems,
          total: isSearchingForNoMatch ? 0 : 201,
          page: requestedPage,
          pageSize: 25,
          hasMore: !isSearchingForNoMatch && requestedPage < 9,
          nextCursor: !isSearchingForNoMatch && requestedPage < 9 ? "next" : null,
        }),
      });
    });

    await page.goto("/dashboard/docs/new");
    await expect(page.getByRole("heading", { name: "Write Documentation" })).toBeVisible();

    const assets = page.getByRole("group", { name: "Assets" });
    await expect(assets.getByText("Asset page 1", { exact: true })).toBeVisible();

    for (let requestedPage = 2; requestedPage <= 9; requestedPage += 1) {
      await assets.getByRole("button", { name: "Next Assets page" }).click();
      await expect(assets.getByLabel(`Assets page ${requestedPage}`)).toHaveText(String(requestedPage));
    }

    await expect(assets.getByText("Asset 201", { exact: true })).toBeVisible();
    await expect(assets.getByText("201 eligible records", { exact: true })).toBeVisible();
    const selected = assets.getByRole("checkbox", { name: "Select Asset 201" });
    await selected.check();
    await expect(selected).toBeChecked();

    await assets.getByRole("textbox", { name: "Search Assets" }).fill("no-match");
    await expect(assets.getByText("Asset 201", { exact: true })).toBeVisible();
    await expect(assets.getByRole("checkbox", { name: "Select Asset 201" })).toBeChecked();
  });
});
