import { test, expect } from "@playwright/test";

test.describe("Documents V1 acceptance - canonical links and direct sharing", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  test("searches the full library, shows related inventory, and copies a public known-link URL", async ({
    page,
    browser,
  }) => {
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/dashboard/docs");

    await page
      .getByPlaceholder("Search knowledge base, manuals, or topics...")
      .fill("Getting Started");
    await expect(
      page.getByText("Document Search Results", { exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Open Getting Started" }).click();

    const relatedSection = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Related inventory" }),
    });
    await expect(relatedSection).toBeVisible();
    await expect(
      relatedSection.locator('a[href^="/dashboard/applications/"]'),
    ).toHaveCount(1);
    await expect(
      relatedSection.locator('a[href^="/dashboard/assets/"]'),
    ).toHaveCount(1);
    await expect(
      relatedSection.locator('a[href^="/dashboard/virtual-machines/"]'),
    ).toHaveCount(1);
    await expect(
      relatedSection.locator('a[href^="/dashboard/databases/"]'),
    ).toHaveCount(1);

    await page
      .getByRole("button", { name: "Copy public document link" })
      .first()
      .click();
    const publicUrl = await page.evaluate(() => navigator.clipboard.readText());
    expect(publicUrl).toMatch(/\/docs\/[a-f0-9-]+$/i);
    const documentId = publicUrl.split("/").pop();
    expect(documentId).toBeTruthy();

    const origin = new URL(page.url()).origin;
    const publicContext = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    try {
      const knownResponse = await publicContext.request.get(
        `${origin}/api/knowledge-base/public/documents/${documentId}`,
      );
      expect(knownResponse.ok()).toBeTruthy();
      const knownDocument = (await knownResponse.json()) as Record<
        string,
        unknown
      >;
      expect(knownDocument.applicationLinks).toBeUndefined();
      expect(knownDocument.assetLinks).toBeUndefined();
      expect(knownDocument.vmLinks).toBeUndefined();
      expect(knownDocument.databaseLinks).toBeUndefined();
      expect(
        (knownDocument.author as Record<string, unknown>)?.username,
      ).toBeUndefined();

      const publicPage = await publicContext.newPage();
      await publicPage.goto(publicUrl);
      await expect(
        publicPage.locator("header").getByRole("heading", { name: "Getting Started" }),
      ).toBeVisible();
      await expect(
        publicPage.getByText("Shared Knowledge Document", { exact: true }),
      ).toBeVisible();
      await expect(
        publicPage.getByText("Verified System Document"),
      ).toHaveCount(0);
      await expect(
        publicPage.getByText("Secure Operations Center"),
      ).toHaveCount(0);
      await expect(
        publicPage.getByRole("button", { name: "Save" }),
      ).toHaveCount(0);

      const protectedEnumerationUrls = [
        "/api/knowledge-base/categories",
        "/api/knowledge-base/documents",
        "/api/knowledge-base/search/documents?q=Getting",
        "/api/knowledge-base/recent/documents",
      ];
      for (const path of protectedEnumerationUrls) {
        const response = await publicContext.request.get(`${origin}${path}`);
        expect(
          [401, 403],
          `${path} should reject anonymous enumeration`,
        ).toContain(response.status());
      }
    } finally {
      await publicContext.close();
    }
  });

  test("serves only an uploaded Knowledge Base image through the anonymous image path", async ({
    page,
    browser,
  }) => {
    await page.goto("/dashboard/docs");
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=",
      "base64",
    );
    const uploadResponse = await page.request.post(
      "/api/knowledge-base/upload",
      {
        multipart: {
          image: {
            name: "kb-acceptance.png",
            mimeType: "image/png",
            buffer: png,
          },
        },
      },
    );
    expect(uploadResponse.ok()).toBeTruthy();
    const { url } = (await uploadResponse.json()) as { url: string };
    expect(url).toMatch(/^\/api\/knowledge-base\/images\/[a-f0-9-]+\.png$/i);

    const origin = new URL(page.url()).origin;
    const publicContext = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    try {
      const imageResponse = await publicContext.request.get(`${origin}${url}`);
      expect(imageResponse.ok()).toBeTruthy();
      expect(imageResponse.headers()["content-type"]).toContain("image/png");
    } finally {
      await publicContext.close();
    }
  });
});

test.describe("Documents V1 acceptance - Viewer is read-only", () => {
  test.use({ storageState: "playwright/.auth/viewer.json" });

  test("hides authoring controls and redirects direct edit routes back to read-only detail", async ({
    page,
  }) => {
    await page.goto("/dashboard/docs");
    await expect(
      page.getByRole("button", { name: "New Document" }),
    ).toHaveCount(0);

    const categoryLink = page
      .locator('a[href^="/dashboard/docs/categories/"]')
      .first();
    await expect(categoryLink).toBeVisible();
    await categoryLink.click();
    await expect(
      page.getByRole("link", { name: "Create a new document" }),
    ).toHaveCount(0);

    await page.goto("/dashboard/docs");
    await page
      .getByPlaceholder("Search knowledge base, manuals, or topics...")
      .fill("Getting Started");
    await page.getByRole("link", { name: "Open Getting Started" }).click();
    await expect(
      page.getByRole("button", { name: "Edit Document" }),
    ).toHaveCount(0);
    const documentId = page.url().split("/").pop();
    expect(documentId).toBeTruthy();

    await page.goto(`/dashboard/docs/${documentId}/edit`);
    await expect(page).toHaveURL(new RegExp(`/dashboard/docs/${documentId}$`));
    await expect(
      page.getByRole("button", { name: "Edit Document" }),
    ).toHaveCount(0);
  });
});
