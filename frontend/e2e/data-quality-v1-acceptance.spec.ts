import { expect, test, type Page, type Route } from "@playwright/test";

type QualityReason = {
  code: string;
  label: string;
  guidance: string;
  category: "context" | "operational";
};

type QualityIssue = {
  id: string;
  name: string;
  issues: string[];
  reasons: QualityReason[];
  kind?: "inventory" | "discovery";
  assetId?: string;
  engine?: string;
};

function contextReason(code: string, label: string): QualityReason {
  return {
    code,
    label,
    guidance: `Resolve ${label} through the normal record workflow.`,
    category: "context",
  };
}

function fulfillQuality(
  route: Route,
  resolved: boolean,
  payload: {
    totalKey: string;
    completeKey?: string;
    issue: QualityIssue;
  },
) {
  const response: Record<string, unknown> = {
    [payload.totalKey]: 1,
    issueCount: resolved ? 0 : 1,
    issues: resolved ? [] : [payload.issue],
    operationalIssueCount: 0,
    operationalIssues: [],
  };
  if (payload.completeKey) response[payload.completeKey] = resolved ? 1 : 0;
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(response),
  });
}

async function installTransitionRoutes(page: Page, isResolved: () => boolean) {
  await page.route("**/applications/data-quality/summary", (route) =>
    fulfillQuality(route, isResolved(), {
      totalKey: "totalApplications",
      completeKey: "completeApplications",
      issue: {
        id: "app-1",
        name: "App Needs Context",
        issues: ["business unit"],
        reasons: [contextReason("application.businessUnit", "business unit")],
      },
    }),
  );
  await page.route("**/assets/data-quality/summary", (route) =>
    fulfillQuality(route, isResolved(), {
      totalKey: "totalAssets",
      completeKey: "completeAssets",
      issue: {
        id: "asset-1",
        assetId: "DQ-ASSET-1",
        name: "Asset Needs Context",
        issues: ["serial number"],
        reasons: [contextReason("asset.serialNumber", "serial number")],
      },
    }),
  );
  await page.route("**/databases/data-quality/summary", (route) =>
    fulfillQuality(route, isResolved(), {
      totalKey: "totalDatabases",
      completeKey: "completeDatabases",
      issue: {
        id: "db-1",
        engine: "PostgreSQL",
        name: "Database Needs Context",
        issues: ["backup policy"],
        reasons: [contextReason("database.backupPolicy", "backup policy")],
      },
    }),
  );
  await page.route("**/vm/data-quality/summary", (route) =>
    fulfillQuality(route, isResolved(), {
      totalKey: "totalVms",
      completeKey: "completeVms",
      issue: {
        id: "vm-1",
        name: "VM Needs Context",
        kind: "inventory",
        issues: ["application component"],
        reasons: [
          contextReason("vm.applicationComponent", "application component"),
        ],
      },
    }),
  );
}

test.describe("Data Quality V1 acceptance - Dashboard contract", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  test("orders Summary, Needs Attention, Recently Updated and separates operational exceptions", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    const summary = page.locator(
      'section[aria-label="Inventory summary counts"]',
    );
    const attention = page.locator(
      'section[aria-labelledby="needs-attention-title"]',
    );
    const recent = page.locator(
      'section[aria-labelledby="recently-updated-title"]',
    );

    await expect(summary).toBeVisible({ timeout: 10000 });
    await expect(attention).toBeVisible();
    await expect(recent).toBeVisible();

    const [summaryBox, attentionBox, recentBox] = await Promise.all([
      summary.boundingBox(),
      attention.boundingBox(),
      recent.boundingBox(),
    ]);
    expect(
      summaryBox,
      "Summary section must have a measurable layout box",
    ).not.toBeNull();
    expect(
      attentionBox,
      "Needs Attention section must have a measurable layout box",
    ).not.toBeNull();
    expect(
      recentBox,
      "Recently Updated section must have a measurable layout box",
    ).not.toBeNull();
    expect(summaryBox!.y).toBeLessThan(attentionBox!.y);
    expect(attentionBox!.y).toBeLessThan(recentBox!.y);

    await expect(
      page.getByText("CMDB Distribution", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Recorded asset status", { exact: true }),
    ).toHaveCount(0);

    await expect(
      attention.getByText("VM · vm-e2e-deleted-in-vcenter", { exact: true }),
      "Prerequisite error: reseed the deterministic Ticket 10 operational fixtures first.",
    ).toBeVisible();
    await expect(
      attention.getByText("vCenter source sync failure", { exact: true }),
    ).toBeVisible();
    await expect(
      attention.getByText("Operational", { exact: true }).first(),
    ).toBeVisible();
    await expect(recent.locator("a").first()).toBeVisible();

    await page.goto("/dashboard/data-quality");
    await expect(
      page.getByRole("heading", { name: "Operational attention" }),
    ).toBeVisible();
    await expect(
      page.getByText("vm-e2e-deleted-in-vcenter", { exact: true }),
    ).toBeVisible();
  });
});

test.describe("Data Quality V1 acceptance - context transitions", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  test("removes resolved Application, Asset, VM, and Database issues after refetch without reloading the page", async ({
    page,
  }) => {
    let resolved = false;
    await installTransitionRoutes(page, () => resolved);
    await page.goto("/dashboard/data-quality");

    await expect(
      page.getByText("App Needs Context", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Asset Needs Context", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Database Needs Context", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("VM Needs Context", { exact: true }),
    ).toBeVisible();

    await expect(
      page.locator('a[href="/dashboard/applications/app-1"]'),
    ).toBeVisible();
    await expect(
      page.locator('a[href="/dashboard/assets/asset-1"]'),
    ).toBeVisible();
    await expect(
      page.locator('a[href="/dashboard/databases/db-1"]'),
    ).toBeVisible();
    await expect(
      page.locator('a[href="/dashboard/virtual-machines/vm-1"]'),
    ).toBeVisible();

    await page.evaluate(() => {
      (window as Window & { __dqRefreshMarker?: string }).__dqRefreshMarker =
        "alive";
    });

    resolved = true;
    await page.getByRole("button", { name: "Refresh quality checks" }).click();
    await expect(
      page.getByText("Inventory quality checks are clear", { exact: true }),
    ).toBeVisible();

    await expect(
      page.getByText("App Needs Context", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Asset Needs Context", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Database Needs Context", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("VM Needs Context", { exact: true }),
    ).toHaveCount(0);

    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as Window & { __dqRefreshMarker?: string })
              .__dqRefreshMarker,
        ),
      )
      .toBe("alive");
  });
});
