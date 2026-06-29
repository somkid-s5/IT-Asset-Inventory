# Session Memory & Architecture Decision Record (ADR)

* **Conversation ID**: `2e20c63e-e9f0-4587-99e7-f501257a65ab`
* **Active Role**: Senior Security & DevOps Engineer / Mentor
* **Status**: Autonomous Execution Authorized by User ("ทำทั้งหมดได้เลย")

---

## Key Architectural Decisions

### 1. Database-Based JWT Revocation
- **Decision**: Implement token revocation via a PostgreSQL `TokenBlocklist` table.
- **Rationale**: Since Redis is not currently present in the development environment (`docker-compose.yml`), using a PostgreSQL table keeps the stack simple, self-contained, and easy to deploy, adhering to the "no over-engineering" rule.

### 2. Auth-Guarded Uploads Route
- **Decision**: Remove public static serving of the `uploads` directory. Replace it with an `UploadsController` that checks authentication via `JwtAuthGuard` before returning the file content.
- **Rationale**: Ensures only authenticated users can access uploaded assets, documents, and other file attachments.

### 3. TOCTOU Race Condition Mitigation (Admin Demotion)
- **Decision**: Wrap the admin count and user update logic in a single Prisma transaction (`$transaction`). Acquire a row lock on all current admins using raw SQL: `SELECT id FROM "User" WHERE role = 'ADMIN'::"Role" FOR UPDATE`.
- **Rationale**: Mitigates the risk of concurrent demotion leaving the system with 0 admins. Row locking is robust and blocks parallel demotion transactions until the first commits.

### 4. DOMPurify Sanitization on Save
- **Decision**: Use custom `sanitizeHtml` in the backend service layer (`TicketCommentsService` and `KnowledgeBaseService`) to clean content before persisting it to the database.
- **Rationale**: Provides server-side prevention of stored XSS vectors without bringing ESM Jest compilation issues.

### 5. Schema Type and Enum Upgrades
- **Decision**: Migrate `DatabaseInventory.status` and `VmVCenterSource.status` to Prisma enums, convert `VmVCenterSource.syncInterval` to an `Int` (representing minutes), and add `Ticket.dueAt` to store SLA deadlines in the database.
- **Rationale**: Enhances database schema integrity, prevents arithmetic failures, and allows native tracking of SLA deadlines. Data migrations are handled safely using PostgreSQL `USING` clauses to cast existing records without dropping columns.

---

## Sprint 1 Checklist & Progress

- [x] Step 1: Update Database Schema, Migrations, and add `TokenBlocklist`
- [x] Step 2: Strip plaintext credentials from Assets `findOne` API & dynamic reveal in frontend
- [x] Step 3: Auth-guard `/uploads/` file access via new `UploadsController`
- [x] Step 4: Implement JWT blocklist on logout (DB-based)
- [x] Step 5: Validate and block SVG avatar uploads to prevent XSS
- [x] Step 6: Wrap Admin demotion in database transaction with `FOR UPDATE` locking
- [x] Step 7: Log failed login attempts with IP to `AuditLog`
- [x] Step 8: Wrap VM promotion in single transaction including retrieval and audit logging
- [x] Step 9: Add missing `CREATE_TICKET`, `UPDATE_TICKET`, `CLOSE_TICKET` events to AuditLog
- [x] Step 10: Enforce `REGISTRATION_SECRET` required in production (fail startup if missing)
- [x] Step 11: Sanitize ticket comments and knowledge document content on save using custom HTML sanitizer (`sanitizeHtml`)
- [x] Step 12: Add `onError` handlers to frontend ticket status/comment mutations
- [x] Step 13: Convert VmGuestAccount nullable check constraint in DB (Completed in migration 1)
- [x] Step 14: Add SLA `dueAt` deadline column to Ticket table + logic
- [x] Step 15: Convert DatabaseInventory.status to DatabaseStatus enum
- [x] Step 16: Convert VmVCenterSource.syncInterval to Int (minutes)
- [x] Step 17: Convert VmVCenterSource.status to VmSourceStatus enum
