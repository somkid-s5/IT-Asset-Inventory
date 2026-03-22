CREATE TABLE "DatabaseInventory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "version" TEXT,
    "environment" TEXT,
    "host" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "port" TEXT,
    "serviceName" TEXT,
    "owner" TEXT,
    "backupPolicy" TEXT,
    "replication" TEXT,
    "linkedApps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maintenanceWindow" TEXT,
    "status" TEXT,
    "note" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatabaseInventory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DatabaseAccount" (
    "id" TEXT NOT NULL,
    "databaseInventoryId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "role" TEXT,
    "encryptedPassword" TEXT NOT NULL,
    "privileges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatabaseAccount_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DatabaseInventory" ADD CONSTRAINT "DatabaseInventory_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DatabaseAccount" ADD CONSTRAINT "DatabaseAccount_databaseInventoryId_fkey" FOREIGN KEY ("databaseInventoryId") REFERENCES "DatabaseInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "DatabaseInventory_name_idx" ON "DatabaseInventory"("name");
CREATE INDEX "DatabaseInventory_environment_idx" ON "DatabaseInventory"("environment");
CREATE INDEX "DatabaseAccount_databaseInventoryId_idx" ON "DatabaseAccount"("databaseInventoryId");
