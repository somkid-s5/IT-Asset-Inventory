import { expect, test } from "@playwright/test";

test.describe("V1.1 shared query state", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("keeps a 500 failure distinct from empty and recovers on retry", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const syntheticUser = {
      id: "ticket-02-e2e-user",
      username: "ticket-02-e2e-user",
      displayName: "Ticket 02 E2E User",
      avatarSeed: "ticket-02-e2e",
      role: "ADMIN" as const,
      mustChangePassword: false,
    };
    let allowRetry = false;

    await page.addInitScript((user) => {
      window.localStorage.setItem("user", JSON.stringify(user));
    }, syntheticUser);

    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: syntheticUser }),
      });
    });

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

    await page.goto("http://localhost:3000/dashboard/applications");
    const errorAlert = page
      .getByRole("alert")
      .filter({ hasText: "Inventory unavailable" });
    await expect(errorAlert).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText("No applications found")).toHaveCount(0);

    allowRetry = true;
    await page.getByRole("button", { name: "Retry" }).click();

    await expect(page.getByRole("table")).toContainText("Retryable ERP");
    await expect(errorAlert).toHaveCount(0);
  });
});
