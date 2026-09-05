DROP INDEX IF EXISTS "VmDiscovery_moid_key";
DROP INDEX IF EXISTS "VmInventory_moid_key";
CREATE UNIQUE INDEX "VmDiscovery_sourceId_moid_key" ON "VmDiscovery"("sourceId", "moid");
CREATE UNIQUE INDEX "VmInventory_sourceId_moid_key" ON "VmInventory"("sourceId", "moid");
ALTER TABLE "VmInventory" ADD COLUMN "discoveryState" "VmDiscoveryState" NOT NULL DEFAULT 'NEEDS_CONTEXT';
