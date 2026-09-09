import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";

import {
  EnvironmentBadge,
  InventoryPagination,
  InventoryQueryStateView,
  InventoryRowActions,
  InventoryTableShell,
  InventoryTableToolbar,
  MissingValue,
  RecordStatusBadge,
} from ".";

test("InventoryTableShell exposes the shared title, toolbar, table, and pagination structure", () => {
  const markup = renderToStaticMarkup(
    <InventoryTableShell
      title="Applications"
      description="Manage service ownership and topology."
      primaryAction={<button type="button">Create application</button>}
      secondaryActions={<button type="button">Export</button>}
      toolbar={
        <InventoryTableToolbar
          search={<input aria-label="Search applications" />}
          filters={<button type="button">Environment</button>}
          activeFilters={<span>PROD</span>}
          onResetFilters={() => undefined}
        />
      }
      pagination={
        <InventoryPagination
          page={1}
          pageSize={20}
          total={42}
          onPageChange={() => undefined}
          onPageSizeChange={() => undefined}
        />
      }
    >
      <div data-slot="representative-table">Inventory records</div>
    </InventoryTableShell>,
  );

  assert.match(markup, /data-slot="inventory-table-shell"/);
  assert.match(markup, /Applications/);
  assert.match(markup, /data-slot="inventory-toolbar"/);
  assert.match(markup, /data-slot="representative-table"/);
  assert.match(markup, /aria-label="Inventory pagination"/);
  assert.match(markup, /Showing 1–20 of 42/);
  assert.match(markup, /Rows per page/);
});

test("InventoryTableShell keeps request errors distinct from empty data", () => {
  const markup = renderToStaticMarkup(
    <InventoryTableShell title="Assets" state="error" onRetry={() => undefined}>
      <div data-slot="representative-table">Should not render during error</div>
    </InventoryTableShell>,
  );

  assert.match(markup, /data-query-state="error"/);
  assert.match(markup, /Inventory unavailable/);
  assert.match(markup, />Retry</);
  assert.doesNotMatch(markup, /Should not render during error/);
});

test("shared query renderer exposes stale refresh failure and returns to ready after retry", () => {
  const failedMarkup = renderToStaticMarkup(
    <InventoryQueryStateView state="error" hasStaleData onRetry={() => undefined}>
      <div data-slot="stale-records">Previously loaded asset</div>
    </InventoryQueryStateView>,
  );
  assert.match(failedMarkup, /data-query-state="error"/);
  assert.match(failedMarkup, /data-stale="true"/);
  assert.match(failedMarkup, /Refresh failed/);
  assert.match(failedMarkup, />Retry</);
  assert.match(failedMarkup, /Previously loaded asset/);
  assert.doesNotMatch(failedMarkup, /No records yet/);

  const retriedMarkup = renderToStaticMarkup(
    <InventoryQueryStateView state="ready">
      <div data-slot="ready-records">Retry succeeded</div>
    </InventoryQueryStateView>,
  );
  assert.match(retriedMarkup, /Retry succeeded/);
  assert.doesNotMatch(retriedMarkup, /Refresh failed/);
});

test("shared query renderer keeps filtered-empty distinct from a ready result", () => {
  const markup = renderToStaticMarkup(
    <InventoryQueryStateView
      state="filtered-empty"
      filteredEmptyState={<h2>No virtual machines found</h2>}
    >
      <div data-slot="ready-records">Should not render for a filtered-empty result</div>
    </InventoryQueryStateView>,
  );

  assert.match(markup, /data-query-state="filtered-empty"/);
  assert.match(markup, /No virtual machines found/);
  assert.doesNotMatch(markup, /Should not render for a filtered-empty result/);
});

test("shared row actions and semantic missing/status components expose accessible grammar", () => {
  const markup = renderToStaticMarkup(
    <>
      <InventoryRowActions
        recordLabel="ERP"
        detailHref="/dashboard/applications/erp"
        edit={{ allowed: true, onSelect: () => undefined }}
        secondaryActions={[{ label: "Sync", onSelect: () => undefined }]}
        lifecycle={{
          status: "ACTIVE",
          archive: { allowed: true, onSelect: () => undefined },
        }}
      />
      <RecordStatusBadge value="ACTIVE" />
      <EnvironmentBadge value="DEV" />
      <MissingValue compact />
      <MissingValue kind="needs-context" />
    </>,
  );

  assert.match(markup, /aria-label="View ERP"/);
  assert.match(markup, /aria-label="Edit ERP"/);
  assert.match(markup, /aria-label="More actions for ERP"/);
  assert.match(markup, /Record status: Active/);
  assert.match(markup, /Environment: Unknown/);
  assert.match(markup, /aria-label="Unknown"[^>]*>—</);
  assert.match(markup, /aria-label="Needs context"[^>]*>Needs context</);
});
