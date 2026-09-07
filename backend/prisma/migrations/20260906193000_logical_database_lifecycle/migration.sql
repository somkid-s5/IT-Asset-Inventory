ALTER TABLE "LogicalDatabase"
ADD COLUMN "status" "DatabaseStatus" NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX "LogicalDatabase_status_idx" ON "LogicalDatabase"("status");
