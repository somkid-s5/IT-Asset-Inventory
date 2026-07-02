-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CREATE_CLIENT';
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_CLIENT';
ALTER TYPE "AuditAction" ADD VALUE 'DELETE_CLIENT';
ALTER TYPE "AuditAction" ADD VALUE 'DELETE_CREDENTIAL';

-- DropForeignKey
ALTER TABLE "Asset" DROP CONSTRAINT "Asset_parentId_fkey";

-- DropForeignKey
ALTER TABLE "VmGuestAccount" DROP CONSTRAINT "VmGuestAccount_discoveryId_fkey";

-- DropForeignKey
ALTER TABLE "VmGuestAccount" DROP CONSTRAINT "VmGuestAccount_inventoryId_fkey";

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VmGuestAccount" ADD CONSTRAINT "VmGuestAccount_discoveryId_fkey" FOREIGN KEY ("discoveryId") REFERENCES "VmDiscovery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VmGuestAccount" ADD CONSTRAINT "VmGuestAccount_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "VmInventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
