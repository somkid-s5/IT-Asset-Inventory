CREATE TYPE "ApplicationStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "ApplicationEnvironmentName" AS ENUM ('PROD', 'UAT', 'TEST');

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
CREATE INDEX "ApplicationCredential_accessId_idx" ON "ApplicationCredential"("accessId");
ALTER TABLE "Application" ADD CONSTRAINT "Application_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApplicationEnvironment" ADD CONSTRAINT "ApplicationEnvironment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationComponent" ADD CONSTRAINT "ApplicationComponent_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "ApplicationEnvironment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationAccess" ADD CONSTRAINT "ApplicationAccess_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationCredential" ADD CONSTRAINT "ApplicationCredential_accessId_fkey" FOREIGN KEY ("accessId") REFERENCES "ApplicationAccess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
CREATE TABLE "_DatabaseAccountToLogicalDatabase" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  CONSTRAINT "_DatabaseAccountToLogicalDatabase_AB_pkey" PRIMARY KEY ("A", "B")
);
CREATE INDEX "_ApplicationComponentToLogicalDatabase_B_index" ON "_ApplicationComponentToLogicalDatabase"("B");
CREATE INDEX "_DatabaseAccountToLogicalDatabase_B_index" ON "_DatabaseAccountToLogicalDatabase"("B");
ALTER TABLE "LogicalDatabase" ADD CONSTRAINT "LogicalDatabase_databaseInventoryId_fkey" FOREIGN KEY ("databaseInventoryId") REFERENCES "DatabaseInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ApplicationComponentToLogicalDatabase" ADD CONSTRAINT "_ApplicationComponentToLogicalDatabase_A_fkey" FOREIGN KEY ("A") REFERENCES "ApplicationComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ApplicationComponentToLogicalDatabase" ADD CONSTRAINT "_ApplicationComponentToLogicalDatabase_B_fkey" FOREIGN KEY ("B") REFERENCES "LogicalDatabase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_DatabaseAccountToLogicalDatabase" ADD CONSTRAINT "_DatabaseAccountToLogicalDatabase_A_fkey" FOREIGN KEY ("A") REFERENCES "DatabaseAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_DatabaseAccountToLogicalDatabase" ADD CONSTRAINT "_DatabaseAccountToLogicalDatabase_B_fkey" FOREIGN KEY ("B") REFERENCES "LogicalDatabase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
