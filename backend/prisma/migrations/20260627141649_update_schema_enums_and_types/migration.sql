-- CreateEnum
CREATE TYPE "DatabaseStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "VmSourceStatus" AS ENUM ('READY_TO_SYNC', 'HEALTHY', 'CONNECTION_FAILED');

-- AlterTable DatabaseInventory
ALTER TABLE "DatabaseInventory" ALTER COLUMN "status" TYPE "DatabaseStatus" USING (
  CASE
    WHEN upper(trim("status")) = 'ACTIVE' THEN 'ACTIVE'::"DatabaseStatus"
    WHEN upper(trim("status")) = 'INACTIVE' THEN 'INACTIVE'::"DatabaseStatus"
    WHEN upper(trim("status")) = 'MAINTENANCE' THEN 'MAINTENANCE'::"DatabaseStatus"
    ELSE 'ACTIVE'::"DatabaseStatus"
  END
);
ALTER TABLE "DatabaseInventory" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable Ticket
ALTER TABLE "Ticket" ADD COLUMN     "dueAt" TIMESTAMP(3);

-- AlterTable VmVCenterSource
ALTER TABLE "VmVCenterSource" ALTER COLUMN "syncInterval" TYPE INTEGER USING (
  coalesce(substring("syncInterval" from '^[0-9]+')::integer, 15)
);

ALTER TABLE "VmVCenterSource" ALTER COLUMN "status" TYPE "VmSourceStatus" USING (
  CASE
    WHEN "status" = 'Ready to sync' THEN 'READY_TO_SYNC'::"VmSourceStatus"
    WHEN "status" = 'Healthy' THEN 'HEALTHY'::"VmSourceStatus"
    WHEN "status" = 'Connection failed' THEN 'CONNECTION_FAILED'::"VmSourceStatus"
    WHEN upper(trim("status")) = 'READY_TO_SYNC' THEN 'READY_TO_SYNC'::"VmSourceStatus"
    WHEN upper(trim("status")) = 'HEALTHY' THEN 'HEALTHY'::"VmSourceStatus"
    WHEN upper(trim("status")) = 'CONNECTION_FAILED' THEN 'CONNECTION_FAILED'::"VmSourceStatus"
    ELSE 'READY_TO_SYNC'::"VmSourceStatus"
  END
);
ALTER TABLE "VmVCenterSource" ALTER COLUMN "status" SET DEFAULT 'READY_TO_SYNC';

