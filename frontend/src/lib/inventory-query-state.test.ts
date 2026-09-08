import test from "node:test";
import assert from "node:assert/strict";

import {
  getInventoryQueryState,
  getInventoryQueryErrorKind,
} from "./inventory-query-state";

const baseQuery = {
  data: undefined,
  error: null,
  isError: false,
  isFetching: false,
  isPending: false,
};

test("generic request failure is not an empty list", () => {
  const result = getInventoryQueryState(
    { ...baseQuery, isError: true, error: new Error("network unavailable") },
    { hasData: false, hasRecords: false },
  );

  assert.equal(result.state, "error");
  assert.equal(result.errorKind, "error");
});

test("successful empty and filtered-empty responses remain distinguishable", () => {
  const empty = getInventoryQueryState(
    { ...baseQuery, data: [] },
    { hasData: true, hasRecords: false },
  );
  const filtered = getInventoryQueryState(
    { ...baseQuery, data: [] },
    { hasData: true, hasRecords: false, isFiltered: true },
  );

  assert.equal(empty.state, "empty");
  assert.equal(filtered.state, "filtered-empty");
});

test("403 and 404 preserve their HTTP meaning", () => {
  assert.equal(getInventoryQueryErrorKind({ response: { status: 403 } }), "forbidden");
  assert.equal(getInventoryQueryErrorKind({ response: { status: 404 } }), "not-found");
});

test("failed background refresh keeps data visibly stale", () => {
  const result = getInventoryQueryState(
    {
      ...baseQuery,
      data: [{ id: "asset-1" }],
      isError: true,
      error: new Error("temporary failure"),
    },
    { hasData: true, hasRecords: true },
  );

  assert.equal(result.state, "error");
  assert.equal(result.hasStaleData, true);
});

test("successful retry returns to ready without changing query state inputs", () => {
  const result = getInventoryQueryState(
    { ...baseQuery, data: [{ id: "asset-1" }] },
    { hasData: true, hasRecords: true, isFiltered: true },
  );

  assert.equal(result.state, "ready");
});
