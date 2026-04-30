-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CREATE_DATABASE';
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_DATABASE';
ALTER TYPE "AuditAction" ADD VALUE 'DELETE_DATABASE';
ALTER TYPE "AuditAction" ADD VALUE 'CREATE_VM';
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_VM';
ALTER TYPE "AuditAction" ADD VALUE 'DELETE_VM';
ALTER TYPE "AuditAction" ADD VALUE 'VCENTER_SYNC';
ALTER TYPE "AuditAction" ADD VALUE 'CREATE_SOURCE';
ALTER TYPE "AuditAction" ADD VALUE 'DELETE_SOURCE';
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_SOURCE';

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "Asset_type_idx" ON "Asset"("type");

-- CreateIndex
CREATE INDEX "Asset_environment_idx" ON "Asset"("environment");

-- CreateIndex
CREATE INDEX "Asset_owner_idx" ON "Asset"("owner");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "DatabaseInventory_status_idx" ON "DatabaseInventory"("status");

-- CreateIndex
CREATE INDEX "DatabaseInventory_engine_idx" ON "DatabaseInventory"("engine");

-- CreateIndex
CREATE INDEX "DatabaseInventory_environment_idx" ON "DatabaseInventory"("environment");

-- CreateIndex
CREATE INDEX "VmInventory_lifecycleState_idx" ON "VmInventory"("lifecycleState");

-- CreateIndex
CREATE INDEX "VmInventory_environment_idx" ON "VmInventory"("environment");

-- CreateIndex
CREATE INDEX "VmInventory_owner_idx" ON "VmInventory"("owner");
