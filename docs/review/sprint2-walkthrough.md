# Walkthrough — Sprint 2 Code Modifications

**Date:** 2026-06-28  
**Status:** Sprint 2 COMPLETE — 4/4 parallel tasks (100%)  
**Build:** Backend `npm run build` ✅ | Frontend `npm run build` ✅

---

## รายการแก้ไขที่สำเร็จทั้งหมด

### 1. Database Schema, Indexes & Soft Delete (DB Agent)
- **`AuditAction` enum**: เพิ่ม `EXPORT_DATA`
- **`User` model**: เพิ่ม `deletedAt DateTime?` เพื่อเตรียมใช้งาน Soft Delete
- **Indexes added**:
  - `AuditLog.targetId` ➔ `@@index([targetId])`
  - `VmDiscovery.state` ➔ `@@index([state])`
  - `Ticket.assigneeId`, `Ticket.clientId` ➔ `@@index([assigneeId])`, `@@index([clientId])`
  - `Credential.assetId` ➔ `@@index([assetId])`
- **Migration**: สร้าง `sprint2_indexes_softdelete_export` สำเร็จ

### 2. Offset Pagination on Assets API (Pagination Agent)
- **`AssetsService.findAll()`**: เปลี่ยนจาก `take: 1000` เป็น offset-based pagination (`page` และ `limit`) โดยมีขีดจำกัดสูงสุดไม่เกิน 200 รายการต่อหน้า
- **`AssetsController.findAll()`**: เปิดรับค่า `@Query('page')` และ `@Query('limit')` เพื่อส่งต่อให้ Service

### 3. Rate Limit & RBAC Tightening (RBAC Agent)
- **`ThrottlerModule` config**: แยก Named Throttlers เป็น `global` (100 req/60s) และ `login` (10 req/60s)
- **`AuthController.login()`**: ตั้งค่า `@SkipThrottle({ global: true })` และครอบด้วย `@Throttle({ login: { ttl: 60000, limit: 10 } })` ป้องกัน brute force ได้อย่างแม่นยำ
- **Ticket Creation guard**: บล็อกระดับสิทธิ์ `VIEWER` ไม่ให้ทำการสร้างตั๋วผ่าน API โดยครอบเดคอเรเตอร์ `@UseGuards(JwtAuthGuard, RolesGuard)` และ `@Roles(Role.ADMIN, Role.EDITOR)`
- **Audit Logs guard**: จำกัดการเข้าถึงหน้าบันทึกระบบ (Audit Logs) เฉพาะกลุ่ม `ADMIN` และ `EDITOR` ในระดับคลาสคอนโทรลเลอร์

### 4. Frontend Improvements (Frontend Agent)
- **Ticket Detail**: เพิ่มตัวเลือกสถานะ `"CLOSED"` (Close Ticket) ในเมนู Dropdown อัปเดตสถานะของตั๋ว
- **Asset List Search**: ปรับแก้ placeholder ของช่องค้นหาข้อมูลจาก `"Search by name, IP, SN..."` ให้ถูกต้องตรงกับขอบเขตค้นหาปัจจุบันคือ `"Search by name..."`
- **Asset Detail Return Path**: ตรวจสอบและยืนยันการใช้ `router.push` (ไม่ใช่ `router.back()`) ป้องกันลิงก์ตรงเสียหายเรียบร้อย

---

## ผลลัพธ์การทดสอบและการคอมไพล์
- **Backend Build**: `npm run build` สำเร็จ 100% ไม่มีข้อผิดพลาด
- **Backend E2E Tests**: `npm run test:e2e` ผ่านหมดทุกหัวข้อทดสอบ
- **Frontend Build**: `npm run build` สำเร็จเรียบร้อยดี
