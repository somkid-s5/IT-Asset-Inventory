-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'LOGIN_FAILED';
ALTER TYPE "AuditAction" ADD VALUE 'CREATE_TICKET';
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_TICKET';
ALTER TYPE "AuditAction" ADD VALUE 'CLOSE_TICKET';
ALTER TYPE "AuditAction" ADD VALUE 'CREATE_COMMENT';
ALTER TYPE "AuditAction" ADD VALUE 'EXPORT_DATA';

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "TokenBlocklist" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenBlocklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TokenBlocklist_token_key" ON "TokenBlocklist"("token");

-- CreateIndex
CREATE INDEX "TokenBlocklist_token_idx" ON "TokenBlocklist"("token");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Custom Check Constraint for VmGuestAccount orphan prevention
ALTER TABLE "VmGuestAccount" ADD CONSTRAINT check_discovery_or_inventory CHECK (("discoveryId" IS NOT NULL) OR ("inventoryId" IS NOT NULL));

