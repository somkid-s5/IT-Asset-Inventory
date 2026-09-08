import test from "node:test";
import assert from "node:assert/strict";

import {
  formatDateTime,
  formatMissingValue,
  getInventoryBadgeMeta,
  getInventoryPageCount,
  getInventoryPaginationSummary,
} from "./inventory-presentation";

test("formatMissingValue keeps the three semantic missing states canonical", () => {
  assert.equal(formatMissingValue(undefined), "Unknown");
  assert.equal(formatMissingValue("", "not-applicable"), "Not applicable");
  assert.equal(formatMissingValue(null, "needs-context"), "Needs context");
  assert.equal(formatMissingValue(0), "0");
});

test("formatDateTime returns deterministic date/time output and preserves invalid values as Unknown", () => {
  assert.equal(
    formatDateTime("2024-01-02T15:04:00.000Z", { timeZone: "UTC" }),
    "Jan 2, 2024, 3:04 PM",
  );
  assert.equal(
    formatDateTime("2024-01-02T15:04:00.000Z", {
      timeZone: "UTC",
      includeTime: false,
    }),
    "Jan 2, 2024",
  );
  assert.equal(formatDateTime("not-a-date"), "Unknown");
});

test("badge metadata keeps environment separate and rejects stale DEV mapping", () => {
  const active = getInventoryBadgeMeta("record-status", "ACTIVE");
  const production = getInventoryBadgeMeta("environment", "PROD");
  const staleEnvironment = getInventoryBadgeMeta("environment", "DEV");

  assert.equal(active.label, "Active");
  assert.equal(active.tone, "success");
  assert.equal(production.label, "PROD");
  assert.equal(production.tone, "danger");
  assert.equal(staleEnvironment.label, "Unknown");
  assert.equal(staleEnvironment.tone, "neutral");
});

test("pagination grammar describes server metadata without inventing rows", () => {
  assert.equal(getInventoryPageCount(42, 20), 3);
  assert.equal(getInventoryPageCount(0, 20), 0);
  assert.equal(getInventoryPaginationSummary({ page: 1, pageSize: 20, total: 42 }), "Showing 1–20 of 42");
  assert.equal(getInventoryPaginationSummary({ page: 3, pageSize: 20, total: 42 }), "Showing 41–42 of 42");
  assert.equal(getInventoryPaginationSummary({ page: 1, pageSize: 20, total: 0 }), "Showing 0 of 0");
});
