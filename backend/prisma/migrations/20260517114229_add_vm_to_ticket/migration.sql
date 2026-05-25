-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "vmId" TEXT;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_vmId_fkey" FOREIGN KEY ("vmId") REFERENCES "VmInventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
