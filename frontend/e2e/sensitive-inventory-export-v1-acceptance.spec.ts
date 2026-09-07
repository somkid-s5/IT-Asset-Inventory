import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs/promises";
import { getE2eCredentials } from "./auth-credentials";

type WorkbookRange = { value(): unknown };
type WorkbookSheet = {
  name(): string;
  usedRange(): WorkbookRange;
};
type Workbook = {
  sheets(): WorkbookSheet[];
  sheet(name: string): WorkbookSheet;
};
type XlsxPopulateModule = {
  fromDataAsync(
    data: Buffer | Uint8Array,
    options?: { password?: string },
  ): Promise<Workbook>;
};

const backendRequire = createRequire(
  path.resolve(process.cwd(), "../backend/package.json"),
);
const xlsxPopulateModule: unknown = backendRequire("xlsx-populate");
const XlsxPopulate = xlsxPopulateModule as XlsxPopulateModule;

const EXPORT_PASSPHRASE = "E2E-Workbook-Key-2026";

function sheetText(workbook: Workbook, sheetName: string) {
  return JSON.stringify(workbook.sheet(sheetName).usedRange().value());
}

test.describe("Sensitive Inventory Export V1 acceptance - Administrator", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  test("downloads a genuinely encrypted workbook with credentials and relationships but excluded content absent", async ({
    page,
  }) => {
    const admin = getE2eCredentials("admin");
    await page.goto("/dashboard/export");

    await expect(
      page.getByRole("heading", { name: "Sensitive Inventory Workbook" }),
    ).toBeVisible();
    await expect(
      page.getByText(/operational passwords in plaintext after it is opened/i),
    ).toBeVisible();

    await page.getByLabel("Confirm your account password").fill(admin.password);
    await page
      .getByLabel("Workbook password", { exact: true })
      .fill(EXPORT_PASSPHRASE);
    await page.getByLabel("Confirm workbook password").fill(EXPORT_PASSPHRASE);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download encrypted XLSX" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      /^inventory-export-\d{4}-\d{2}-\d{2}\.xlsx$/,
    );
    const downloadedPath = await download.path();
    expect(downloadedPath).not.toBeNull();
    const encryptedData = await fs.readFile(downloadedPath as string);

    await expect(
      XlsxPopulate.fromDataAsync(encryptedData),
    ).rejects.toBeDefined();
    await expect(
      XlsxPopulate.fromDataAsync(encryptedData, { password: "Wrong-E2E-Key" }),
    ).rejects.toBeDefined();

    const workbook = await XlsxPopulate.fromDataAsync(encryptedData, {
      password: EXPORT_PASSPHRASE,
    });
    const sheetNames = workbook.sheets().map((sheet) => sheet.name());
    expect(sheetNames).toEqual(
      expect.arrayContaining([
        "Export Metadata",
        "Field Definitions",
        "Applications",
        "Environments",
        "Components",
        "Application Access",
        "Assets",
        "Asset Access Points",
        "Virtual Machines",
        "Database Instances",
        "Logical Databases",
        "Relationships",
        "vCenter Sources",
        "Credentials",
      ]),
    );

    const credentials = workbook
      .sheet("Credentials")
      .usedRange()
      .value() as unknown[][];
    const vmCredential = credentials.find((row) => row.includes("svc_vm_e2e"));
    const databaseCredential = credentials.find((row) =>
      row.includes("svc_registry"),
    );
    expect(vmCredential).toBeDefined();
    expect(databaseCredential).toBeDefined();
    expect(String(vmCredential?.[6] ?? "").length).toBeGreaterThan(0);
    expect(String(databaseCredential?.[6] ?? "").length).toBeGreaterThan(0);

    const relationships = sheetText(workbook, "Relationships");
    expect(relationships).toContain("COMPONENT_VM");
    expect(relationships).toContain("PRIMARY");
    expect(relationships).toContain("SHARED");
    expect(relationships).toContain("DATABASE_ACCOUNT_LOGICAL_SCOPE");

    const allWorkbookText = sheetNames
      .map((name) => sheetText(workbook, name))
      .join("\n");
    expect(allWorkbookText).not.toContain("Getting Started");
    expect(allWorkbookText).not.toContain("Canonical runbook");
    expect(allWorkbookText).not.toContain("JWT_SECRET");
    expect(allWorkbookText).not.toContain("CREDENTIAL_ENCRYPTION_KEY");
    expect(allWorkbookText).not.toContain(EXPORT_PASSPHRASE);
  });
});

test.describe("Sensitive Inventory Export V1 acceptance - non-Admin", () => {
  test.use({ storageState: "playwright/.auth/viewer.json" });

  test("does not expose export navigation or generation controls to a Viewer", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("link", { name: "Sensitive Inventory Export" }),
    ).toHaveCount(0);

    await page.goto("/dashboard/export");
    await expect(page.getByText("Administrator access required")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Download encrypted XLSX" }),
    ).toHaveCount(0);
  });
});
