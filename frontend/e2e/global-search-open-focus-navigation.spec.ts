import { expect, test, type Page } from "@playwright/test";

const admin = {
  id: "ticket-16-admin",
  username: "ticket-16-admin",
  displayName: "Ticket 16 Admin",
  avatarSeed: "ticket-16-admin",
  role: "ADMIN",
  mustChangePassword: false,
};

const applicationResult = {
  id: "ticket-16-application",
  name: "Ticket 16 Application",
  technicalOwner: "Platform Operations",
  businessUnit: "Infrastructure",
};

const applicationDetail = {
  ...applicationResult,
  description: "Ticket 16 focused navigation fixture",
  status: "ACTIVE",
  environments: [],
  access: [],
  updatedAt: "2026-09-09T00:00:00.000Z",
};

function installAuth(page: Page) {
  return page.addInitScript((snapshot) => {
    window.localStorage.setItem("user", JSON.stringify(snapshot));
  }, admin);
}

async function mockSearchShell(page: Page) {
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: admin }),
    });
  });

  await page.route("**/api/applications**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        pathname.endsWith("/ticket-16-application")
          ? applicationDetail
          : [],
      ),
    });
  });

  await page.route("**/api/search**", async (route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get("q");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        applications: query === "Ticket 16 Application" ? [applicationResult] : [],
        assets: [],
        virtualMachines: [],
        databases: [],
        logicalDatabases: [],
        documents: [],
      }),
    });
  });
}

test.describe("Global Search shared open/focus/navigation seam", () => {
  test("pointer open focuses the query and selecting a result closes before navigation", async ({
    page,
  }) => {
    await installAuth(page);
    await mockSearchShell(page);
    await page.goto("/dashboard/applications");

    await page.getByRole("button", { name: "Open global search" }).click();
    const dialog = page.getByRole("dialog");
    const input = dialog.getByRole("combobox", { name: "Search inventory" });
    await expect(input).toBeFocused();

    await input.fill("Ticket 16 Application");
    const result = dialog.getByRole("option", {
      name: /Ticket 16 Application/,
    });
    await expect(result).toBeVisible();
    await result.click();

    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(
      /\/dashboard\/applications\/ticket-16-application$/,
    );
  });

  test("Ctrl+K opens the same focused palette and closing clears the query", async ({
    page,
  }) => {
    await installAuth(page);
    await mockSearchShell(page);
    await page.goto("/dashboard/applications");

    const trigger = page.getByRole("button", { name: "Open global search" });
    await expect(trigger).toBeVisible();
    await page.keyboard.press("Control+K");
    let dialog = page.getByRole("dialog");
    let input = dialog.getByRole("combobox", { name: "Search inventory" });
    await expect(input).toBeFocused();
    await input.fill("Ticket 16 Application");
    await expect(
      dialog.getByRole("option", { name: /Ticket 16 Application/ }),
    ).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);

    await expect(trigger).toBeVisible();
    await page.keyboard.press("Control+K");
    dialog = page.getByRole("dialog");
    input = dialog.getByRole("combobox", { name: "Search inventory" });
    await expect(input).toBeFocused();
    await expect(
      dialog.getByText("Type at least two characters to search.", {
        exact: true,
      }),
    ).toBeVisible();
  });
});
