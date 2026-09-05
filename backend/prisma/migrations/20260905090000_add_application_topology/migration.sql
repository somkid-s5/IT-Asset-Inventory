CREATE TYPE "ApplicationStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "ApplicationEnvironmentName" AS ENUM ('PROD', 'UAT', 'TEST');
ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';
ALTER TYPE "DatabaseStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CREATE_APPLICATION';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'UPDATE_APPLICATION';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ARCHIVE_APPLICATION';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'RESTORE_APPLICATION';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'VIEW_APPLICATION_PASSWORD';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COPY_APPLICATION_PASSWORD';

CREATE TABLE "Application" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "technicalOwner" TEXT,
  "businessUnit" TEXT,
  "description" TEXT,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ApplicationEnvironment" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "name" "ApplicationEnvironmentName" NOT NULL,
  "noDatabase" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApplicationEnvironment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ApplicationComponent" (
  "id" TEXT NOT NULL,
  "environmentId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApplicationComponent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ApplicationAccess" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "environmentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApplicationAccess_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ApplicationCredential" (
  "id" TEXT NOT NULL,
  "accessId" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "encryptedPassword" TEXT NOT NULL,
  "role" TEXT,
  "lastChangedDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApplicationCredential_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Application_name_key" ON "Application"("name");
CREATE INDEX "Application_status_idx" ON "Application"("status");
CREATE INDEX "Application_technicalOwner_idx" ON "Application"("technicalOwner");
CREATE INDEX "Application_businessUnit_idx" ON "Application"("businessUnit");
CREATE UNIQUE INDEX "ApplicationEnvironment_applicationId_name_key" ON "ApplicationEnvironment"("applicationId", "name");
CREATE INDEX "ApplicationEnvironment_applicationId_sortOrder_idx" ON "ApplicationEnvironment"("applicationId", "sortOrder");
CREATE UNIQUE INDEX "ApplicationComponent_environmentId_name_key" ON "ApplicationComponent"("environmentId", "name");
CREATE INDEX "ApplicationComponent_environmentId_sortOrder_idx" ON "ApplicationComponent"("environmentId", "sortOrder");
CREATE INDEX "ApplicationAccess_applicationId_idx" ON "ApplicationAccess"("applicationId");
CREATE INDEX "ApplicationAccess_environmentId_idx" ON "ApplicationAccess"("environmentId");
CREATE INDEX "ApplicationCredential_accessId_idx" ON "ApplicationCredential"("accessId");
ALTER TABLE "Application" ADD CONSTRAINT "Application_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApplicationEnvironment" ADD CONSTRAINT "ApplicationEnvironment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationComponent" ADD CONSTRAINT "ApplicationComponent_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "ApplicationEnvironment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationAccess" ADD CONSTRAINT "ApplicationAccess_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationAccess" ALTER COLUMN "applicationId" DROP NOT NULL;
ALTER TABLE "ApplicationAccess" ADD CONSTRAINT "ApplicationAccess_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "ApplicationEnvironment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApplicationCredential" ADD CONSTRAINT "ApplicationCredential_accessId_fkey" FOREIGN KEY ("accessId") REFERENCES "ApplicationAccess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD COLUMN "responsibleParty" TEXT;
ALTER TABLE "DatabaseInventory" ADD COLUMN "responsibleParty" TEXT;
ALTER TABLE "DatabaseInventory" ADD COLUMN "hostAssetId" TEXT;
ALTER TABLE "DatabaseInventory" ADD COLUMN "hostVmId" TEXT;
ALTER TABLE "VmInventory" ADD COLUMN "responsibleParty" TEXT;
CREATE INDEX "DatabaseInventory_hostAssetId_idx" ON "DatabaseInventory"("hostAssetId");
CREATE INDEX "DatabaseInventory_hostVmId_idx" ON "DatabaseInventory"("hostVmId");
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

CREATE TABLE "LogicalDatabase" (
  "id" TEXT NOT NULL,
  "databaseInventoryId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LogicalDatabase_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "DatabaseAccount" ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'INSTANCE';
CREATE UNIQUE INDEX "LogicalDatabase_databaseInventoryId_name_key" ON "LogicalDatabase"("databaseInventoryId", "name");
CREATE INDEX "LogicalDatabase_databaseInventoryId_idx" ON "LogicalDatabase"("databaseInventoryId");
CREATE TABLE "_ApplicationComponentToLogicalDatabase" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  CONSTRAINT "_ApplicationComponentToLogicalDatabase_AB_pkey" PRIMARY KEY ("A", "B")
);
CREATE TABLE "_DatabaseAccountScopes" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  CONSTRAINT "_DatabaseAccountScopes_AB_pkey" PRIMARY KEY ("A", "B")
);
CREATE INDEX "_ApplicationComponentToLogicalDatabase_B_index" ON "_ApplicationComponentToLogicalDatabase"("B");
CREATE INDEX "_DatabaseAccountScopes_B_index" ON "_DatabaseAccountScopes"("B");
ALTER TABLE "LogicalDatabase" ADD CONSTRAINT "LogicalDatabase_databaseInventoryId_fkey" FOREIGN KEY ("databaseInventoryId") REFERENCES "DatabaseInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ApplicationComponentToLogicalDatabase" ADD CONSTRAINT "_ApplicationComponentToLogicalDatabase_A_fkey" FOREIGN KEY ("A") REFERENCES "ApplicationComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ApplicationComponentToLogicalDatabase" ADD CONSTRAINT "_ApplicationComponentToLogicalDatabase_B_fkey" FOREIGN KEY ("B") REFERENCES "LogicalDatabase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_DatabaseAccountScopes" ADD CONSTRAINT "_DatabaseAccountScopes_A_fkey" FOREIGN KEY ("A") REFERENCES "DatabaseAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_DatabaseAccountScopes" ADD CONSTRAINT "_DatabaseAccountScopes_B_fkey" FOREIGN KEY ("B") REFERENCES "LogicalDatabase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
