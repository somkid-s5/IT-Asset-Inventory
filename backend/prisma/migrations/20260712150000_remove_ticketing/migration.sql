-- The product is now an inventory registry. Ticketing data and its supporting
-- client/comment tables are intentionally removed as one bounded feature.
-- Take a database backup before applying this migration in any environment.

DELETE FROM "AuditLog"
WHERE "action"::text IN (
  'CREATE_TICKET', 'UPDATE_TICKET', 'CLOSE_TICKET',
  'CREATE_COMMENT', 'CREATE_CLIENT', 'UPDATE_CLIENT', 'DELETE_CLIENT'
);

DROP TABLE IF EXISTS "TicketComment";
DROP TABLE IF EXISTS "Ticket";
DROP TABLE IF EXISTS "Client";

CREATE TYPE "AuditAction_new" AS ENUM (
  'VIEW_PASSWORD', 'COPY_PASSWORD', 'LOGIN', 'LOGIN_FAILED',
  'CREATE_USER', 'UPDATE_USER_ROLE', 'RESET_USER_PASSWORD',
  'CHANGE_OWN_PASSWORD', 'CREATE_ASSET', 'UPDATE_ASSET', 'DELETE_ASSET',
  'CREATE_CREDENTIAL', 'UPDATE_CREDENTIAL', 'CREATE_DATABASE',
  'UPDATE_DATABASE', 'DELETE_DATABASE', 'CREATE_VM', 'UPDATE_VM',
  'DELETE_VM', 'VCENTER_SYNC', 'CREATE_SOURCE', 'DELETE_SOURCE',
  'UPDATE_SOURCE', 'EXPORT_DATA', 'DELETE_CREDENTIAL'
);

ALTER TABLE "AuditLog"
  ALTER COLUMN "action" TYPE "AuditAction_new"
  USING "action"::text::"AuditAction_new";
DROP TYPE "AuditAction";
ALTER TYPE "AuditAction_new" RENAME TO "AuditAction";

DROP TYPE IF EXISTS "TicketPriority";
DROP TYPE IF EXISTS "TicketStatus";
