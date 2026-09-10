-- Application Access previously allowed orphaned or application-only rows.
-- Backfill only the ownership that is unambiguous from an existing environment.
-- Invalid ownership still blocks the constraint migration. Legacy rows with
-- multiple accesses are preserved and reported because no primary can be
-- selected from the legacy shape without guessing.
DO $$
DECLARE
  invalid_ids TEXT;
  ambiguous_ids TEXT;
BEGIN
  UPDATE "ApplicationAccess" AS access
  SET "applicationId" = environment."applicationId"
  FROM "ApplicationEnvironment" AS environment
  WHERE access."applicationId" IS NULL
    AND access."environmentId" = environment."id";

  SELECT string_agg(access."id", ', ' ORDER BY access."id")
  INTO invalid_ids
  FROM "ApplicationAccess" AS access
  LEFT JOIN "ApplicationEnvironment" AS environment
    ON environment."id" = access."environmentId"
  WHERE access."applicationId" IS NULL
     OR access."environmentId" IS NULL
     OR environment."id" IS NULL
     OR environment."applicationId" <> access."applicationId";

  IF invalid_ids IS NOT NULL THEN
    RAISE EXCEPTION
      'ApplicationAccess ownership backfill blocked for row ids: %', invalid_ids
      USING HINT = 'Assign every access row to one existing Application Environment and rerun this migration.';
  END IF;

  SELECT string_agg(access."id", ', ' ORDER BY access."id")
  INTO ambiguous_ids
  FROM "ApplicationAccess" AS access
  WHERE access."environmentId" IN (
    SELECT "environmentId"
    FROM "ApplicationAccess"
    GROUP BY "environmentId"
    HAVING COUNT(*) > 1
  );

  IF ambiguous_ids IS NOT NULL THEN
    RAISE WARNING
      'ApplicationAccess primary backfill is ambiguous for row ids: %', ambiguous_ids
      USING HINT = 'Choose the intended primary access explicitly after this migration; legacy rows remain non-primary.';
  END IF;
END $$;

ALTER TABLE "ApplicationAccess"
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT FALSE;

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "environmentId"
      ORDER BY "createdAt" ASC, "id" ASC
    ) - 1 AS "sortOrder"
  FROM "ApplicationAccess"
)
UPDATE "ApplicationAccess" AS access
SET
  "sortOrder" = ranked."sortOrder",
  "isPrimary" = FALSE
FROM ranked
WHERE ranked."id" = access."id";

ALTER TABLE "ApplicationAccess"
  ALTER COLUMN "applicationId" SET NOT NULL,
  ALTER COLUMN "environmentId" SET NOT NULL;

ALTER TABLE "ApplicationAccess"
  DROP CONSTRAINT "ApplicationAccess_environmentId_fkey";

ALTER TABLE "ApplicationAccess"
  ADD CONSTRAINT "ApplicationAccess_environmentId_fkey"
  FOREIGN KEY ("environmentId") REFERENCES "ApplicationEnvironment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ApplicationAccess_environmentId_sortOrder_idx"
  ON "ApplicationAccess"("environmentId", "sortOrder");

CREATE UNIQUE INDEX "ApplicationAccess_one_primary_per_environment_idx"
  ON "ApplicationAccess"("environmentId")
  WHERE "isPrimary" = TRUE;
