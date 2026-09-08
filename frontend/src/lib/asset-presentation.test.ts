import test from "node:test";
import assert from "node:assert/strict";

import { ASSET_TYPE_OPTIONS, getAssetTypeLabel } from "./asset-presentation";

test("asset type presentation uses one canonical label map", () => {
  assert.equal(getAssetTypeLabel("SP"), "Service Processor");
  assert.equal(getAssetTypeLabel("SERVER"), "Server");
  assert.equal(getAssetTypeLabel("unknown"), "Unknown");
  assert.deepEqual(
    ASSET_TYPE_OPTIONS.map((option) => option.value),
    ["SERVER", "STORAGE", "SWITCH", "SP", "NETWORK"],
  );
});
