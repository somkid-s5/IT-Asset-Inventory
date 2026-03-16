ALTER TABLE "User" ADD COLUMN "avatarSeed" TEXT;

UPDATE "User"
SET "avatarSeed" = SUBSTRING(md5(COALESCE("username", "id") || '-' || "id") FROM 1 FOR 16)
WHERE "avatarSeed" IS NULL;

ALTER TABLE "User" ALTER COLUMN "avatarSeed" SET NOT NULL;
