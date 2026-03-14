-- DropForeignKey
ALTER TABLE "Asset" DROP CONSTRAINT "Asset_parentId_fkey";

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
