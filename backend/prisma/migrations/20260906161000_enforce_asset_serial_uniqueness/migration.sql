-- Optional identifiers use NULL for "unknown". Blank strings are not valid identities.
UPDATE "Asset"
SET "assetId" = NULL
WHERE "assetId" IS NOT NULL AND BTRIM("assetId") = '';

UPDATE "Asset"
SET "sn" = NULL
WHERE "sn" IS NOT NULL AND BTRIM("sn") = '';

-- Do not silently rewrite real duplicate serials. Fail the migration with a
-- readable reason so the inventory can be corrected deliberately first.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Asset"
    WHERE "sn" IS NOT NULL
    GROUP BY "sn"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce unique Asset serial numbers: duplicate non-blank serial numbers exist.';
  END IF;
END $$;

CREATE UNIQUE INDEX "Asset_sn_key" ON "Asset"("sn");
