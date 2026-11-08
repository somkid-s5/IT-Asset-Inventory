import { expect, test } from "@playwright/test";

test.use({ storageState: "playwright/.auth/admin.json" });

test("document detail replaces the preceding Application header", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/dashboard/applications");
  await page.getByRole("link", { name: "Treasury Registry" }).click();
  await expect(page.getByRole("link", { name: "Getting Started" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("link", { name: "Getting Started" }).click();
  await expect(page).toHaveURL(/\/dashboard\/docs\/[^/]+$/, { timeout: 30_000 });
  await expect(page.getByRole("main").getByRole("heading", { name: "Getting Started" }).first()).toBeVisible();
  await expect(page.getByRole("banner").getByRole("heading", { name: "Getting Started" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("banner").getByRole("link", { name: "Knowledge Base" })).toBeVisible({ timeout: 30_000 });
});

test("document header follows an edit and subsequent navigation", async ({ page }) => {
  test.setTimeout(90_000);
  const categoriesResponse = await page.request.get("/api/knowledge-base/categories");
  if (!categoriesResponse.ok()) throw new Error("Could not load document categories");
  const categories = await categoriesResponse.json() as Array<{ id: string; name: string }>;
  const category = categories.find((item) => item.name === "General");
  if (!category) throw new Error("General category missing");
  const title = `Header test ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const updatedTitle = `${title} · Revised`;
  const created = await page.request.post("/api/knowledge-base/documents", {
    data: { title, content: "Test document body", categoryId: category.id },
  });
  if (!created.ok()) throw new Error(`Document creation failed: ${created.status()}`);
  const document = await created.json() as { id: string };
  try {
    await page.goto(`/dashboard/docs/${document.id}`);
    await expect(page.getByRole("banner").getByRole("heading", { name: title })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Edit Document" }).click();
    await expect(page.getByRole("banner").getByRole("heading", { name: "Knowledge Base editor" })).toBeVisible();
    await page.getByPlaceholder("Enter title...").fill(updatedTitle);
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByRole("banner").getByRole("heading", { name: updatedTitle })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("main").getByRole("heading", { name: updatedTitle })).toBeVisible();
    await page.getByRole("link", { name: "Applications", exact: true }).click();
    await expect(page.getByRole("banner").getByRole("heading", { name: "Applications" })).toBeVisible({ timeout: 30_000 });
  } finally {
    const deleted = await page.request.delete(`/api/knowledge-base/documents/${document.id}`);
    if (!deleted.ok()) throw new Error(`Document cleanup failed: ${deleted.status()}`);
  }
});
