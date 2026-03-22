ALTER TABLE "User" ADD COLUMN "username" TEXT;
ALTER TABLE "User" ADD COLUMN "displayName" TEXT;
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

WITH prepared AS (
  SELECT
    "id",
    "createdAt",
    COALESCE(
      NULLIF(regexp_replace(split_part(COALESCE("email", ''), '@', 1), '[^A-Za-z0-9_]+', '_', 'g'), ''),
      'user'
    ) AS base_username
  FROM "User"
),
ranked AS (
  SELECT
    "id",
    CASE
      WHEN ROW_NUMBER() OVER (PARTITION BY base_username ORDER BY "createdAt", "id") = 1 THEN base_username
      ELSE base_username || '_' || ROW_NUMBER() OVER (PARTITION BY base_username ORDER BY "createdAt", "id")
    END AS username,
    INITCAP(REPLACE(base_username, '_', ' ')) AS display_name
  FROM prepared
)
UPDATE "User" AS u
SET
  "username" = ranked.username,
  "displayName" = ranked.display_name
FROM ranked
WHERE u."id" = ranked."id";

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "displayName" SET NOT NULL;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
