import { test, expect } from "@playwright/test";

test.describe("Application V1 acceptance - archive and restore", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  test("restores an archived application after the refreshed list settles", async ({
    page,
  }) => {
    const name = `e2e-application-archive-${Date.now()}`;

    await page.goto("/dashboard/applications");
    await page.getByRole("button", { name: "New application" }).click();
    await page.getByLabel("Application name").fill(name);
    await page.getByRole("button", { name: "Create application" }).click();
    await expect(page.getByText("Application created")).toBeVisible();

    const search = page.getByLabel("Search applications");
    await search.fill(name);
    let row = page.getByRole("row").filter({ hasText: name });
    await expect(row).toBeVisible();
    await expect(row).toContainText("ACTIVE");

    const archiveResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        /\/applications\/[^/]+\/archive$/.test(response.url()) &&
        response.status() === 200,
    );
    await row.getByRole("button", { name: "Archive" }).click();
    await archiveResponse;

    await page.getByRole("button", { name: "Show archived" }).click();
    await search.fill(name);
    row = page.getByRole("row").filter({ hasText: name });
    await expect(row).toBeVisible();
    await expect(row).toContainText("ARCHIVED");

    const restoreResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        /\/applications\/[^/]+\/restore$/.test(response.url()) &&
        response.status() === 200,
    );
    const refreshedList = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        response.url().includes("/api/applications") &&
        response.url().includes("includeArchived=true") &&
        response.url().includes(encodeURIComponent(name)) &&
        response.status() === 200,
    );
    await row.getByRole("button", { name: "Restore" }).click();
    await Promise.all([restoreResponse, refreshedList]);

    // The PATCH and refreshed GET can complete before React commits the new row.
    // Wait for the user-visible state instead of asserting an intermediate DOM snapshot.
    await expect(row).toContainText("ACTIVE");

    const finalArchiveResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        /\/applications\/[^/]+\/archive$/.test(response.url()) &&
        response.status() === 200,
    );
    await row.getByRole("button", { name: "Archive" }).click();
    await finalArchiveResponse;
  });
});
