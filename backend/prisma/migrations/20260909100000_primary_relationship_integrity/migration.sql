-- Enforce the one-primary invariant at the database boundary as well as in
-- service validation. Existing duplicate rows are surfaced instead of being
-- silently rewritten or deleted by this migration.
DO $$
DECLARE
  duplicate_assets TEXT;
  duplicate_vms TEXT;
BEGIN
  SELECT string_agg("assetId", ', ' ORDER BY "assetId")
  INTO duplicate_assets
  FROM (
    SELECT "assetId"
    FROM "ApplicationComponentAsset"
    WHERE "relationType" = 'PRIMARY'
    GROUP BY "assetId"
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_assets IS NOT NULL THEN
    RAISE EXCEPTION
      'ApplicationComponentAsset primary relationship backfill blocked for asset ids: %', duplicate_assets
      USING HINT = 'Resolve duplicate PRIMARY relationships explicitly before rerunning this migration.';
  END IF;

  SELECT string_agg("vmId", ', ' ORDER BY "vmId")
  INTO duplicate_vms
  FROM (
    SELECT "vmId"
    FROM "ApplicationComponentVm"
    WHERE "relationType" = 'PRIMARY'
    GROUP BY "vmId"
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_vms IS NOT NULL THEN
    RAISE EXCEPTION
      'ApplicationComponentVm primary relationship backfill blocked for VM ids: %', duplicate_vms
      USING HINT = 'Resolve duplicate PRIMARY relationships explicitly before rerunning this migration.';
  END IF;
END $$;

CREATE UNIQUE INDEX "ApplicationComponentAsset_one_primary_per_asset_idx"
  ON "ApplicationComponentAsset" ("assetId")
  WHERE "relationType" = 'PRIMARY';

CREATE UNIQUE INDEX "ApplicationComponentVm_one_primary_per_vm_idx"
  ON "ApplicationComponentVm" ("vmId")
  WHERE "relationType" = 'PRIMARY';
