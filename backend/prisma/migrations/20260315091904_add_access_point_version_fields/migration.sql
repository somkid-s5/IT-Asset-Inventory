-- AlterTable
ALTER TABLE "Credential" ADD COLUMN     "manageType" TEXT,
ADD COLUMN     "version" TEXT;

-- AlterTable
ALTER TABLE "IPAllocation" ADD COLUMN     "manageType" TEXT,
ADD COLUMN     "version" TEXT;
