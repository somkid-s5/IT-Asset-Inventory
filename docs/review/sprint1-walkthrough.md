# Walkthrough — Sprint 1 & Schema-level Enum/Type Improvements

**Date:** 2026-06-27  
**Status:** Sprint 1 COMPLETE — 17/17 items (100%)  
**Build:** Backend `npm run build` ✅ | E2E `npm run test:e2e` ✅ | Frontend `npm run build` ✅

---

## รายการแก้ไขที่สำเร็จทั้งหมด

### 1. Database Schema, Enums & Migrations

| Field | Before | After | Notes |
|-------|--------|-------|-------|
| `DatabaseInventory.status` | `String?` | `DatabaseStatus` enum | `ACTIVE`, `INACTIVE`, `MAINTENANCE` — SQL Cast ไม่ทำลายข้อมูลเดิม |
| `VmVCenterSource.syncInterval` | `String` (`"15 min"`) | `Int` (นาที) | Regex extraction จาก DTO เดิม ใช้งานร่วมกับ frontend ราบรื่น |
| `VmVCenterSource.status` | `String` | `VmSourceStatus` enum | `READY_TO_SYNC`, `HEALTHY`, `CONNECTION_FAILED` |
| `Ticket.dueAt` (SLA) | ไม่มี | `DateTime?` | คำนวณตาม Priority อัตโนมัติเมื่อสร้าง/อัปเดตตั๋ว |
| `TokenBlocklist` | ไม่มี | ตารางใหม่ | ยกเลิก JWT ทันทีหลัง logout |
| `VmGuestAccount` | orphan risk | check constraint | `check_discovery_or_inventory` ระดับ DB |

### 2. Security — Plaintext Password Leak (CRITICAL)

- `AssetsService.toDetail()` — กรอง `encryptedPassword` ออกจาก response หลัก
- รหัสผ่านดึงได้ผ่าน `/api/credentials/:id/reveal` เท่านั้น (authenticated + logged)

### 3. Static File Auth Guard (CRITICAL)

- ลบ `ServeStaticModule` สำหรับ `/uploads` ออกจาก `app.module.ts`
- สร้าง `UploadsController` ด้วย `@UseGuards(JwtAuthGuard)` + directory traversal protection

### 4. XSS Prevention (CRITICAL)

- `sanitizeHtml()` ใน [`sanitize.ts`](file:///c:/Workspace/projects/personal/Github/02-dev-project/IT-Asset-Inventory/backend/src/utils/sanitize.ts) — กำจัด unsafe HTML ก่อนบันทึก DB (แทน DOMPurify เพื่อ Jest compatibility)
- `knowledge-base.service.ts` — sanitize ทั้ง create และ update
- `ticket-comments.service.ts` — sanitize ก่อน save
- Block SVG avatar upload ใน `auth.service.ts`

### 5. Race Condition Prevention (CRITICAL)

- Admin demotion — `$transaction` + `SELECT ... FOR UPDATE` row lock
- VM promotion (Discovery → Inventory) — wrapped ใน `$transaction`

### 6. Audit & Error Handling (CRITICAL)

- `LOGIN_FAILED` logged พร้อม IP address ทั้ง user-not-found และ wrong-password cases
- Ticket CRUD (`CREATE_TICKET`, `UPDATE_TICKET`, `CLOSE_TICKET`) เพิ่มใน `AuditAction` enum
- Frontend `onError` handlers เพิ่มใน ticket status mutation และ comment mutation

### 7. Production Guard (HIGH)

- `main.ts` — `process.exit(1)` ถ้า `NODE_ENV=production` และไม่มี `REGISTRATION_SECRET`

---

## Sprint 1 Final Checklist

| # | Issue | Status |
|---|-------|--------|
| 1 | Strip plaintext password from `toDetail()` | ✅ DONE |
| 2 | Auth-guard `/uploads/` route | ✅ DONE |
| 3 | JWT blocklist on logout (`TokenBlocklist`) | ✅ DONE |
| 4 | Block SVG avatar upload | ✅ DONE |
| 5 | Sanitize `KnowledgeDocument.content` | ✅ DONE |
| 6 | Admin demotion atomic transaction | ✅ DONE |
| 7 | `VmGuestAccount` orphan prevention (DB constraint) | ✅ DONE |
| 8 | VM promotion `$transaction` | ✅ DONE |
| 9 | Log `LOGIN_FAILED` with IP | ✅ DONE |
| 10 | `AuditAction` TICKET enum values | ✅ DONE |
| 11 | Frontend `onError` handlers | ✅ DONE |
| 12 | `REGISTRATION_SECRET` required in production | ✅ DONE |
| 13 | Sanitize `TicketComment.content` | ✅ DONE |
| 14 | `DatabaseInventory.status` → enum `DatabaseStatus` | ✅ DONE |
| 15 | `VmVCenterSource.syncInterval` → `Int` | ✅ DONE |
| 16 | `VmVCenterSource.status` → enum `VmSourceStatus` | ✅ DONE |
| 17 | `Ticket.dueAt` SLA field + auto-calculation | ✅ DONE |

---

## What's Next — Sprint 2 Targets

- Per-IP + per-username rate limiting on login
- Sanitize `customMetadata` before render
- `IPAllocation.address` IP format validation in DTO
- Cursor-based pagination (replace `take:1000`)
- Optimistic locking on Asset updates (version field)
- Ticket idempotency guard
- Refresh token flow
- DB indexes: `AuditLog.targetId`, `VmDiscovery.state`, `Ticket.assigneeId`, `Ticket.clientId`
- VIEWER RBAC tightening (ticket create, audit log read)
- User soft-delete (`deletedAt`)
- CLOSED ticket status in UI
- Asset search scope fix
- File type allowlist + size limit for attachments
- `EXPORT_DATA` audit action

See full backlog: [final-review-report.md](./final-review-report.md)
