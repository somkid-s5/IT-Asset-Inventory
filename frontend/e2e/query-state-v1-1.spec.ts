import { expect, test } from "@playwright/test";

test.describe("V1.1 shared query state", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  test("keeps a 500 failure distinct from empty and recovers on retry", async ({
    page,
  }) => {
    test.setTimeout(45_000);
    let allowRetry = false;

    await page.route("**/api/applications**", async (route) => {
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
            id: "retryable-application",
            name: "Retryable ERP",
            description: "A browser-test record",
            technicalOwner: "Platform",
            businessUnit: "Operations",
            status: "ACTIVE",
            access: [],
            environments: [],
            completeness: { complete: true, completeness: 100 },
          },
        ]),
      });
    });

    await page.goto("/dashboard/applications");
    await expect(page.getByRole("alert")).toContainText("Inventory unavailable");
    await expect(page.getByText("No applications found")).toHaveCount(0);

    allowRetry = true;
    await page.getByRole("button", { name: "Retry" }).click();

    await expect(page.getByRole("table")).toContainText("Retryable ERP");
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
});
