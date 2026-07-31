import { test as setup, expect } from "@playwright/test";
import { getE2eCredentials } from "./auth-credentials";

const authFile = "playwright/.auth/user.json";

setup("authenticate as admin", async ({ page }) => {
  const credentials = getE2eCredentials("admin");
  await page.goto("/login");
  await page.getByLabel("Username").fill(credentials.username);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
  await page.context().storageState({ path: authFile });
});
