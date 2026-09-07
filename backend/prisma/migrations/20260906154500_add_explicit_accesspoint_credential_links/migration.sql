CREATE TABLE "IPAllocationCredential" (
  "ipAllocationId" TEXT NOT NULL,
  "credentialId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IPAllocationCredential_pkey" PRIMARY KEY ("ipAllocationId", "credentialId")
);

CREATE INDEX "IPAllocationCredential_credentialId_idx" ON "IPAllocationCredential"("credentialId");

ALTER TABLE "IPAllocationCredential"
  ADD CONSTRAINT "IPAllocationCredential_ipAllocationId_fkey"
  FOREIGN KEY ("ipAllocationId") REFERENCES "IPAllocation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IPAllocationCredential"
  ADD CONSTRAINT "IPAllocationCredential_credentialId_fkey"
  FOREIGN KEY ("credentialId") REFERENCES "Credential"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill every explicit legacy single-credential association into the new
-- cardinality-correct join table. The old column remains temporarily so a
-- deployed database can roll forward without losing compatibility.
INSERT INTO "IPAllocationCredential" ("ipAllocationId", "credentialId")
SELECT "id", "credentialId"
FROM "IPAllocation"
WHERE "credentialId" IS NOT NULL
ON CONFLICT ("ipAllocationId", "credentialId") DO NOTHING;

-- Older rows predate the explicit FK and were reconstructed in the UI from
-- duplicated access metadata. Convert only exact, non-empty metadata matches
-- once during migration; runtime code must not use this heuristic afterward.
INSERT INTO "IPAllocationCredential" ("ipAllocationId", "credentialId")
SELECT ip."id", credential."id"
FROM "IPAllocation" AS ip
JOIN "Credential" AS credential
  ON credential."assetId" = ip."assetId"
 AND COALESCE(NULLIF(BTRIM(credential."nodeLabel"), ''), '') = COALESCE(NULLIF(BTRIM(ip."nodeLabel"), ''), '')
 AND COALESCE(NULLIF(BTRIM(credential."type"), ''), '') = COALESCE(NULLIF(BTRIM(ip."type"), ''), '')
 AND COALESCE(NULLIF(BTRIM(credential."manageType"), ''), '') = COALESCE(NULLIF(BTRIM(ip."manageType"), ''), '')
 AND COALESCE(NULLIF(BTRIM(credential."version"), ''), '') = COALESCE(NULLIF(BTRIM(ip."version"), ''), '')
WHERE (
  NULLIF(BTRIM(credential."nodeLabel"), '') IS NOT NULL OR
  NULLIF(BTRIM(credential."type"), '') IS NOT NULL OR
  NULLIF(BTRIM(credential."manageType"), '') IS NOT NULL OR
  NULLIF(BTRIM(credential."version"), '') IS NOT NULL
)
ON CONFLICT ("ipAllocationId", "credentialId") DO NOTHING;
