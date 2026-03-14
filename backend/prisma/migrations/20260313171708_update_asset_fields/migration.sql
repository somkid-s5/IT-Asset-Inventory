/*
  Warnings:

  - A unique constraint covering the columns `[assetId]` on the table `Asset` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AssetType" ADD VALUE 'STORAGE';
ALTER TYPE "AssetType" ADD VALUE 'SWITCH';
ALTER TYPE "AssetType" ADD VALUE 'SP';

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "assetId" TEXT,
ADD COLUMN     "brandModel" TEXT,
ADD COLUMN     "manageType" TEXT,
ADD COLUMN     "rack" TEXT,
ADD COLUMN     "sn" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Asset_assetId_key" ON "Asset"("assetId");
