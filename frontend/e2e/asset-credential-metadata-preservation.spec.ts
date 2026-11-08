import { expect, test } from "@playwright/test";

const API_BASE_URL = (
  process.env.PLAYWRIGHT_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "/api"
).replace(/\/$/, "");

function apiPath(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

type AssetRecord = {
  id: string;
  name: string;
  credentials: Array<{
    id: string;
    username: string;
    type: string | null;
    nodeLabel: string | null;
    manageType: string | null;
    version: string | null;
  }>;
};

test.describe("Asset credential metadata preservation", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  test("editing unrelated Asset fields preserves credential metadata distinct from its Access Point", async ({
    page,
  }) => {
    const runId = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    const originalName = `Credential Metadata E2E ${runId}`;
    const updatedName = `${originalName} Updated`;
    let assetId: string | undefined;

    try {
      const createdResponse = await page.request.post(apiPath("/assets"), {
        data: {
          name: originalName,
          assetId: `E2E-CREDENTIAL-${runId}`,
          type: "SERVER",
          owner: "E2E Acceptance",
          ips: [
            {
              address: "10.222.222.123",
              type: "Management",
              nodeLabel: "BMC",
              manageType: "SSH",
              version: "iLO 6",
            },
          ],
          credentials: [
            {
              username: `e2e_credential_${runId}`,
              password: `E2E-only-${runId}!`,
              type: "OS",
              nodeLabel: "MGMT",
              manageType: "Direct",
              version: "Ubuntu 24.04",
            },
          ],
        },
      });
      if (!createdResponse.ok()) {
        throw new Error("Could not create the Asset metadata fixture.");
      }
      const created = (await createdResponse.json()) as AssetRecord;
      assetId = created.id;
      const credential = created.credentials[0];
      if (!assetId || !credential) {
        throw new Error("Asset metadata fixture is missing its credential.");
      }

      const linkedResponse = await page.request.patch(
        apiPath(`/assets/${assetId}`),
        {
          data: {
            ips: [
              {
                address: "10.222.222.123",
                type: "Management",
                nodeLabel: "BMC",
                manageType: "SSH",
                version: "iLO 6",
                credentialIds: [credential.id],
              },
            ],
            credentials: [
              {
                id: credential.id,
                username: credential.username,
                password: "",
                type: "OS",
                nodeLabel: "MGMT",
                manageType: "Direct",
                version: "Ubuntu 24.04",
              },
            ],
          },
        },
      );
      if (!linkedResponse.ok()) {
        throw new Error("Could not link the metadata fixture credential.");
      }

      await page.goto(`/dashboard/assets/${assetId}`);
      await expect(
        page.getByRole("main").getByRole("heading", { name: originalName }),
      ).toBeVisible({ timeout: 30_000 });
      await page.screenshot({
        path: "output/application-audit/08-credential-before-edit.png",
        fullPage: true,
      });

      await page.getByRole("button", { name: "Edit Asset" }).click();
      await expect(
        page.getByRole("heading", { name: "Edit Asset Information" }),
      ).toBeVisible();
      await page.getByPlaceholder("Enter asset or host name").fill(updatedName);
      await page.screenshot({
        path: "output/application-audit/09-credential-edit-before-save.png",
        fullPage: true,
      });
      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(
        page.getByRole("main").getByRole("heading", { name: updatedName }),
      ).toBeVisible({ timeout: 30_000 });
      await page.reload();
      await expect(
        page.getByRole("main").getByRole("heading", { name: updatedName }),
      ).toBeVisible({ timeout: 30_000 });
      await page.getByRole("button", { name: /10\.222\.222\.123/ }).click();
      await expect(
        page.getByText(credential.username, { exact: true }),
      ).toBeVisible();
      await expect(page.getByText("OS", { exact: true })).toBeVisible();
      await page.screenshot({
        path: "output/application-audit/10-credential-after-save.png",
        fullPage: true,
      });

    } finally {
      if (assetId) {
        const cleanupResponse = await page.request.patch(
          apiPath(`/assets/${assetId}/archive`),
        );
        if (!cleanupResponse.ok() && cleanupResponse.status() !== 404) {
          throw new Error("Credential metadata fixture cleanup failed.");
        }
      }
    }
  });
});
