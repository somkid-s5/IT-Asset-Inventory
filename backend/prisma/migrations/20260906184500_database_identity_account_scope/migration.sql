-- Ticket 07a/07b: progressive Database identity + stable account scope contract.

-- Fail fast on legacy scope values instead of silently coercing data.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "DatabaseAccount"
    WHERE "scope" NOT IN ('INSTANCE', 'LOGICAL_DATABASES')
  ) THEN
    RAISE EXCEPTION 'DatabaseAccount contains unsupported scope values; resolve them before applying DatabaseAccountScope migration.';
  END IF;
END $$;

-- Fail fast on duplicate usernames inside one Database Instance before adding uniqueness.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "DatabaseAccount"
    GROUP BY "databaseInventoryId", "username"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate DatabaseAccount usernames exist within at least one Database Inventory; resolve duplicates before applying uniqueness constraint.';
  END IF;
END $$;

CREATE TYPE "DatabaseAccountScope" AS ENUM ('INSTANCE', 'LOGICAL_DATABASES');

ALTER TABLE "DatabaseInventory"
  ALTER COLUMN "host" DROP NOT NULL,
  ALTER COLUMN "ipAddress" DROP NOT NULL;

ALTER TABLE "DatabaseAccount"
  ALTER COLUMN "scope" DROP DEFAULT,
  ALTER COLUMN "scope" TYPE "DatabaseAccountScope" USING ("scope"::"DatabaseAccountScope"),
  ALTER COLUMN "scope" SET DEFAULT 'INSTANCE';

CREATE UNIQUE INDEX "DatabaseAccount_databaseInventoryId_username_key"
  ON "DatabaseAccount"("databaseInventoryId", "username");
