ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';
ALTER TYPE "DatabaseStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

ALTER TABLE "ApplicationAccess" ADD COLUMN "environmentId" TEXT;
ALTER TABLE "ApplicationAccess" ALTER COLUMN "applicationId" DROP NOT NULL;
CREATE INDEX "ApplicationAccess_environmentId_idx" ON "ApplicationAccess"("environmentId");
ALTER TABLE "ApplicationAccess" ADD CONSTRAINT "ApplicationAccess_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "ApplicationEnvironment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Asset" ADD COLUMN "responsibleParty" TEXT;
ALTER TABLE "DatabaseInventory" ADD COLUMN "responsibleParty" TEXT;
ALTER TABLE "DatabaseInventory" ADD COLUMN "hostAssetId" TEXT;
ALTER TABLE "DatabaseInventory" ADD COLUMN "hostVmId" TEXT;
ALTER TABLE "VmInventory" ADD COLUMN "responsibleParty" TEXT;
ALTER TABLE "IPAllocation" ADD COLUMN "credentialId" TEXT;
CREATE INDEX "DatabaseInventory_hostAssetId_idx" ON "DatabaseInventory"("hostAssetId");
CREATE INDEX "DatabaseInventory_hostVmId_idx" ON "DatabaseInventory"("hostVmId");
CREATE INDEX "IPAllocation_credentialId_idx" ON "IPAllocation"("credentialId");
ALTER TABLE "IPAllocation" ADD CONSTRAINT "IPAllocation_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ApplicationComponentAsset" (
  "id" TEXT NOT NULL,
  "componentId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "relationType" TEXT NOT NULL DEFAULT 'PRIMARY',
  "responsibleParty" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApplicationComponentAsset_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ApplicationComponentVm" (
  "id" TEXT NOT NULL,
  "componentId" TEXT NOT NULL,
  "vmId" TEXT NOT NULL,
  "relationType" TEXT NOT NULL DEFAULT 'PRIMARY',
  "responsibleParty" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApplicationComponentVm_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ApplicationComponentAsset_componentId_assetId_key" ON "ApplicationComponentAsset"("componentId", "assetId");
CREATE INDEX "ApplicationComponentAsset_assetId_idx" ON "ApplicationComponentAsset"("assetId");
CREATE UNIQUE INDEX "ApplicationComponentVm_componentId_vmId_key" ON "ApplicationComponentVm"("componentId", "vmId");
CREATE INDEX "ApplicationComponentVm_vmId_idx" ON "ApplicationComponentVm"("vmId");
ALTER TABLE "ApplicationComponentAsset" ADD CONSTRAINT "ApplicationComponentAsset_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "ApplicationComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationComponentAsset" ADD CONSTRAINT "ApplicationComponentAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationComponentVm" ADD CONSTRAINT "ApplicationComponentVm_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "ApplicationComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationComponentVm" ADD CONSTRAINT "ApplicationComponentVm_vmId_fkey" FOREIGN KEY ("vmId") REFERENCES "VmInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DatabaseInventory" ADD CONSTRAINT "DatabaseInventory_hostAssetId_fkey" FOREIGN KEY ("hostAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DatabaseInventory" ADD CONSTRAINT "DatabaseInventory_hostVmId_fkey" FOREIGN KEY ("hostVmId") REFERENCES "VmInventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "_DatabaseAccountToLogicalDatabase" RENAME TO "_DatabaseAccountScopes";
ALTER INDEX "_DatabaseAccountToLogicalDatabase_AB_pkey" RENAME TO "_DatabaseAccountScopes_AB_pkey";
ALTER INDEX "_DatabaseAccountToLogicalDatabase_B_index" RENAME TO "_DatabaseAccountScopes_B_index";
ALTER TABLE "_DatabaseAccountScopes" RENAME CONSTRAINT "_DatabaseAccountToLogicalDatabase_A_fkey" TO "_DatabaseAccountScopes_A_fkey";
ALTER TABLE "_DatabaseAccountScopes" RENAME CONSTRAINT "_DatabaseAccountToLogicalDatabase_B_fkey" TO "_DatabaseAccountScopes_B_fkey";

CREATE TABLE "KnowledgeDocumentApplication" (
  "documentId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  CONSTRAINT "KnowledgeDocumentApplication_pkey" PRIMARY KEY ("documentId", "applicationId")
);
CREATE TABLE "KnowledgeDocumentAsset" (
  "documentId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  CONSTRAINT "KnowledgeDocumentAsset_pkey" PRIMARY KEY ("documentId", "assetId")
);
CREATE TABLE "KnowledgeDocumentVm" (
  "documentId" TEXT NOT NULL,
  "vmId" TEXT NOT NULL,
  CONSTRAINT "KnowledgeDocumentVm_pkey" PRIMARY KEY ("documentId", "vmId")
);
CREATE TABLE "KnowledgeDocumentDatabase" (
  "documentId" TEXT NOT NULL,
  "databaseId" TEXT NOT NULL,
  CONSTRAINT "KnowledgeDocumentDatabase_pkey" PRIMARY KEY ("documentId", "databaseId")
);
CREATE INDEX "KnowledgeDocumentApplication_applicationId_idx" ON "KnowledgeDocumentApplication"("applicationId");
CREATE INDEX "KnowledgeDocumentAsset_assetId_idx" ON "KnowledgeDocumentAsset"("assetId");
CREATE INDEX "KnowledgeDocumentVm_vmId_idx" ON "KnowledgeDocumentVm"("vmId");
CREATE INDEX "KnowledgeDocumentDatabase_databaseId_idx" ON "KnowledgeDocumentDatabase"("databaseId");
ALTER TABLE "KnowledgeDocumentApplication" ADD CONSTRAINT "KnowledgeDocumentApplication_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeDocumentApplication" ADD CONSTRAINT "KnowledgeDocumentApplication_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeDocumentAsset" ADD CONSTRAINT "KnowledgeDocumentAsset_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeDocumentAsset" ADD CONSTRAINT "KnowledgeDocumentAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeDocumentVm" ADD CONSTRAINT "KnowledgeDocumentVm_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeDocumentVm" ADD CONSTRAINT "KnowledgeDocumentVm_vmId_fkey" FOREIGN KEY ("vmId") REFERENCES "VmInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeDocumentDatabase" ADD CONSTRAINT "KnowledgeDocumentDatabase_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeDocumentDatabase" ADD CONSTRAINT "KnowledgeDocumentDatabase_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "DatabaseInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
