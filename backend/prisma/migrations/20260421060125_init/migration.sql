-- CreateEnum
CREATE TYPE "VmPowerState" AS ENUM ('RUNNING', 'STOPPED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VmEnvironment" AS ENUM ('PROD', 'TEST', 'UAT');

-- CreateEnum
CREATE TYPE "VmDiscoveryState" AS ENUM ('NEEDS_CONTEXT', 'READY_TO_PROMOTE', 'DRIFTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VmLifecycleState" AS ENUM ('DRAFT', 'ACTIVE', 'DELETED_IN_VCENTER', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VmCriticality" AS ENUM ('MISSION_CRITICAL', 'BUSINESS_CRITICAL', 'STANDARD');

-- DropIndex
DROP INDEX "DatabaseAccount_databaseInventoryId_idx";

-- DropIndex
DROP INDEX "DatabaseInventory_environment_idx";

-- DropIndex
DROP INDEX "DatabaseInventory_name_idx";

-- AlterTable
ALTER TABLE "DatabaseAccount" ALTER COLUMN "privileges" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DatabaseInventory" ALTER COLUMN "linkedApps" DROP DEFAULT;

-- CreateTable
CREATE TABLE "VmVCenterSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "username" TEXT,
    "encryptedPassword" TEXT,
    "syncInterval" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VmVCenterSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VmDiscovery" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "systemName" TEXT,
    "moid" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "cluster" TEXT NOT NULL,
    "clusterResolution" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "host" TEXT NOT NULL,
    "hostResolution" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "computerName" TEXT,
    "guestOs" TEXT NOT NULL,
    "primaryIp" TEXT NOT NULL,
    "cpuCores" INTEGER NOT NULL,
    "memoryGb" INTEGER NOT NULL,
    "storageGb" INTEGER NOT NULL,
    "disks" JSONB,
    "networkLabel" TEXT NOT NULL,
    "powerState" "VmPowerState" NOT NULL,
    "state" "VmDiscoveryState" NOT NULL,
    "completeness" INTEGER NOT NULL,
    "missingFields" TEXT[],
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "tags" TEXT[],
    "guestAccountsCount" INTEGER NOT NULL DEFAULT 0,
    "owner" TEXT,
    "environment" "VmEnvironment",
    "businessUnit" TEXT,
    "slaTier" TEXT,
    "serviceRole" TEXT,
    "criticality" "VmCriticality",
    "description" TEXT,
    "notes" TEXT,
    "suggestedOwner" TEXT,
    "suggestedEnvironment" "VmEnvironment",
    "suggestedServiceRole" TEXT,
    "suggestedCriticality" "VmCriticality",
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VmDiscovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VmInventory" (
    "id" TEXT NOT NULL,
    "discoveryId" TEXT,
    "sourceId" TEXT,
    "name" TEXT NOT NULL,
    "systemName" TEXT NOT NULL,
    "moid" TEXT NOT NULL,
    "environment" "VmEnvironment" NOT NULL,
    "cluster" TEXT NOT NULL,
    "clusterResolution" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "host" TEXT NOT NULL,
    "hostResolution" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "computerName" TEXT,
    "guestOs" TEXT NOT NULL,
    "primaryIp" TEXT NOT NULL,
    "cpuCores" INTEGER NOT NULL,
    "memoryGb" INTEGER NOT NULL,
    "storageGb" INTEGER NOT NULL,
    "disks" JSONB,
    "networkLabel" TEXT NOT NULL,
    "powerState" "VmPowerState" NOT NULL,
    "lifecycleState" "VmLifecycleState" NOT NULL,
    "syncState" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "businessUnit" TEXT NOT NULL,
    "slaTier" TEXT NOT NULL,
    "serviceRole" TEXT NOT NULL,
    "criticality" "VmCriticality" NOT NULL,
    "description" TEXT NOT NULL,
    "tags" TEXT[],
    "lastSyncAt" TIMESTAMP(3) NOT NULL,
    "syncedFields" TEXT[],
    "managedFields" TEXT[],
    "notes" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VmInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VmGuestAccount" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "encryptedPassword" TEXT NOT NULL,
    "accessMethod" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "note" TEXT,
    "discoveryId" TEXT,
    "inventoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VmGuestAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VmVCenterSource_name_key" ON "VmVCenterSource"("name");

-- CreateIndex
CREATE UNIQUE INDEX "VmDiscovery_moid_key" ON "VmDiscovery"("moid");

-- CreateIndex
CREATE UNIQUE INDEX "VmInventory_discoveryId_key" ON "VmInventory"("discoveryId");

-- CreateIndex
CREATE UNIQUE INDEX "VmInventory_moid_key" ON "VmInventory"("moid");

-- AddForeignKey
ALTER TABLE "VmVCenterSource" ADD CONSTRAINT "VmVCenterSource_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VmDiscovery" ADD CONSTRAINT "VmDiscovery_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "VmVCenterSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VmDiscovery" ADD CONSTRAINT "VmDiscovery_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VmInventory" ADD CONSTRAINT "VmInventory_discoveryId_fkey" FOREIGN KEY ("discoveryId") REFERENCES "VmDiscovery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VmInventory" ADD CONSTRAINT "VmInventory_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "VmVCenterSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VmInventory" ADD CONSTRAINT "VmInventory_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VmGuestAccount" ADD CONSTRAINT "VmGuestAccount_discoveryId_fkey" FOREIGN KEY ("discoveryId") REFERENCES "VmDiscovery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VmGuestAccount" ADD CONSTRAINT "VmGuestAccount_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "VmInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
