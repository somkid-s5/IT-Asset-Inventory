## 📋 FINAL REVIEW REPORT — IT Asset Inventory System

### Executive Summary
- Total issues found: 21
- Critical: 6 | High: 7 | Nice-to-have: 5 | Remove: 3
- Overall readiness: 🔴 NOT READY
- Generated: 2026-06-30T22:10:10+07:00

---

### Consolidated Issue List
| # | Issue | Found by | Priority | Effort (S/M/L) | Action |
|---|-------|----------|----------|----------------|--------|
| 1 | Plaintext Guest Password Exposure in VM API | Agent 2 (BA), Agent 4 (Security) | CRITICAL | S | ถอดฟิลด์ `guestAccounts.password` ออกจาก API response ทั่วไป และบังคับใช้ Role Guard พร้อมบันทึก Audit Log เมื่อกด Reveal |
| 2 | Cascading Asset Deletion & Hard Delete Data Loss | Agent 2 (BA), Agent 5 (Data) | CRITICAL | M | ปรับ `onDelete` ใน Prisma Schema ไม่ให้ลบ Asset ลูกอัตโนมัติ (เปลี่ยนเป็น Restrict/SetNull) และแก้ `users.service.ts` ให้ใช้ Soft Delete (`deletedAt`) |
| 3 | Unhandled Prisma Exception API Crashes (HTTP 500) | Agent 3 (QA), Agent 5 (Data) | CRITICAL | M | อัปเดต `GlobalExceptionFilter` ดักจับ Prisma Error (`P2002`, `P2025`, `P2003`) แปลงเป็น HTTP 400/404/409 แทน HTTP 500 |
| 4 | Missing Role Guards on Sensitive API Endpoints | Agent 4 (Security) | CRITICAL | S | เพิ่ม `@UseGuards(RolesGuard)` และ `@Roles` ใน `ClientsController`, `PATCH /api/tickets/:id` และ `GET /api/credentials/asset/:assetId` |
| 5 | Blank Screen Traps & Missing Route Error/403 Boundaries | Agent 1 (UX) | CRITICAL | M | สร้าง `error.tsx` ป้องกัน Layout ล่ม และสร้าง Component `AccessDenied` แสดงผลแทนการ return `null` ในหน้า Admin (/users, /audit-logs) |
| 6 | Hardcoded JWT Secret Fallback Vulnerability | Agent 4 (Security) | CRITICAL | S | ถอดค่า fallback `'super-secret-key'` ออกจาก `jwt.strategy.ts` และตั้งให้ระบบ throw error ทันทีหากไม่พบ `JWT_SECRET` ใน ENV |
| 7 | Missing DTO Validation Boundaries & XSS Risks | Agent 3 (QA) | HIGH | M | เพิ่ม `@MaxLength`, `@IsIP()`, ตรวจสอบ Port Range (1-65535) ใน DTO และเพิ่มการทำ Sanitization สำหรับข้อความ Input |
| 8 | Race Conditions & Missing Transactions in Core Mutations | Agent 3 (QA), Agent 5 (Data) | HIGH | M | ครอบ Database Transaction และทำ Optimistic Locking (`@updatedAt`) ใน `AssetsService.update`, `TicketsService.generateTicketNo` และ `ClientsService` |
| 9 | Service Desk Accessibility Restriction for VIEWER Role | Agent 2 (BA) | HIGH | S | ปรับสิทธิ์ใน `TicketsController` อนุญาตให้ผู้ใช้งานทุก Role ที่ล็อกอินสามารถเปิด Ticket แจ้งปัญหา IT ได้ |
| 10 | Unbounded Query Limit & Missing Pagination | Agent 2 (BA), Agent 5 (Data) | HIGH | M | บังคับใช้ Pagination และจำกัด Limit สูงสุดต่อรีเควสต์ (เช่น Max 200) ในตาราง Tickets, VMs, Databases และ Audit Logs |
| 11 | Missing Foreign Key Indexes Causing Query Bottlenecks | Agent 5 (Data) | HIGH | S | เพิ่ม Index ใน Prisma Schema สำหรับ `Ticket.assetId`, `Ticket.vmId`, `TicketComment.ticketId` และปรับปรุง Composite index ของ `IPAllocation` |
| 12 | Form Validation Feedback & Unhandled List Error States | Agent 1 (UX) | HIGH | M | ปรับฟอร์ม `VmFormDialog`, `DatabaseFormDialog`, `Ticket` ให้ใช้ Zod + React Hook Form แสดงข้อความใต้ Input และเพิ่ม Error state ในตาราง |
| 13 | Unauthenticated Public File Attachment Access | Agent 4 (Security) | HIGH | S | เพิ่ม Auth Guard สำหรับ endpoint ดาวน์โหลดหรือเปิดดูไฟล์แนบใน `/api/assets/uploads/:filename` |
| 14 | Axios Interceptor Timeout Retry & Token Expiration Handling | Agent 3 (QA) | HIGH | M | ปิดออโต้ retry สำหรับ non-idempotent request (`PATCH`/`DELETE`) และแจ้งเตือนผู้ใช้ก่อน redirect ไปหน้า login เมื่อ token หมดอายุ |
| 15 | Inconsistent Route Loading Skeletons (`loading.tsx`) | Agent 1 (UX) | NICE-TO-HAVE | S | เพิ่มไฟล์ `loading.tsx` พร้อม Skeleton ในโฟลเดอร์ `/dashboard/tickets`, `/dashboard/docs` และ `/dashboard/profile` |
| 16 | Sidebar Active Item Collapse Behavior | Agent 1 (UX) | NICE-TO-HAVE | S | ปรับพฤติกรรมใน `AppSidebar.tsx` เมื่อคลิกเมนูที่ active อยู่ให้ Scroll to top หรือไม่ทำอะไร แทนการย่อเมนูด้านข้าง |
| 17 | Automated Expiration & Warranty Alerting Cron Job | Agent 2 (BA) | NICE-TO-HAVE | L | สร้าง Cron Job ตรวจสอบ `warrantyExpiration` และ `eolDate` เพื่อส่งการแจ้งเตือนล่วงหน้าให้ผู้ดูแลระบบ |
| 18 | Database Schema Enum Standardization | Agent 5 (Data) | NICE-TO-HAVE | M | ปรับฟิลด์ `environment`, `status` และ `syncState` จาก `String?` ให้ใช้ Enum มาตรฐานกลาง |
| 19 | Comprehensive E2E & Integration Test Suite | Agent 3 (QA) | NICE-TO-HAVE | L | เขียน Integration และ E2E Tests ครอบคลุม Core API Flows และ RBAC ใน CI/CD Pipeline |
| 20 | Complex Asset Request & Approval Workflows | Agent 2 (BA) | REMOVE | L | ตัดออกจาก Scope (Descope) ของ Release แรก เพื่อมุ่งเน้น Core Asset & Inventory Tracking ไม่ให้โครงการบานปลาย |
| 21 | Redundant CSV Export DOM Manipulation Code | Agent 1 (UX) | REMOVE | S | ลบโค้ดสร้างและแทรก DOM ปลอมใน `handleExport` ออก และเปลี่ยนไปใช้ Web API หรือ Utility ทางตรง |

---

### Top 5 Must-Fix Before Go-Live
1. **Plaintext Guest Account Password Exposure in VM API** — ข้อมูลรหัสผ่านของ VM Guest Accounts (`guestAccounts.password`) ถูกส่งกลับมาใน API (`GET /api/vm/discoveries/:id`, `inventory/:id`) เป็นข้อความธรรมดาโดยไม่มี `@Roles` guard ป้องกัน ทำให้ผู้ใช้ทุกระดับรวมถึง VIEWER สามารถดูรหัสผ่านเซิร์ฟเวอร์ได้ทันที — Reported by: Agent 2 (BA), Agent 4 (Security)
2. **Cascading Asset Deletion & Hard Delete Data Loss** — ความสัมพันธ์ `Asset.parent` ตั้งค่า `onDelete: Cascade` ทำให้การลบสินทรัพย์หลัก (เช่น Rack หรือ Host Server) จะลบสินทรัพย์ย่อยทั้งหมดในระบบทิ้งทันที และ `users.service.ts` ลบข้อมูลผู้ใช้แบบ Hard Delete ขัดแย้งกับ Schema ที่มี `deletedAt` — Reported by: Agent 2 (BA), Agent 5 (Data)
3. **Unhandled Prisma Exception API Crashes (HTTP 500)** — ระบบไม่มีการแปลงข้อผิดพลาดจากฐานข้อมูล Prisma (`P2002` Duplicate, `P2025` Not Found, `P2003` FK Violation) ทำให้เมื่อผู้ใช้กรอกข้อมูลซ้ำหรือลบข้อมูลที่ผูกสัมพันธ์อยู่ API จะล่มและคืนค่า HTTP 500 แทนที่จะแจ้งเตือนผู้ใช้ด้วย HTTP 400/409 — Reported by: Agent 3 (QA), Agent 5 (Data)
4. **Missing Role Guards on Sensitive API Endpoints** — Endpoints สำคัญเช่น `ClientsController` (CRUD ลูกค้า), `PATCH /api/tickets/:id` (แก้ไขตั๋ว) และ `GET /api/credentials/asset/:assetId` ขาด `@Roles` decorator ทำให้ผู้ใช้ระดับ VIEWER สามารถแก้ไขข้อมูลระบบและดูรายการ Credential ได้ — Reported by: Agent 4 (Security)
5. **Blank Screen Traps & Missing Route Error/403 Boundaries** — หน้า App ไม่มี `error.tsx` ป้องกันความผิดพลาด ทำให้เมื่อเกิด Runtime error หรือเข้าถึงหน้า Admin (`/users`, `/audit-logs`) โดยไม่มีสิทธิ์ หน้าเว็บจะแสดงจอขาวโล่ง (Blank Screen) โดยไม่มีเมนูด้านข้างหรือปุ่มนำทางกลับ — Reported by: Agent 1 (UX)

---

### Cross-Agent Insights
(ปัญหาที่หลาย agent เจอพร้อมกัน = critical signal)

| Issue | Agents that found it | Combined Risk |
|-------|---------------------|---------------|
| Plaintext Password & Credential Leakage | Agent 2 (BA), Agent 4 (Security) | **High Security Risk**: การขาด Masking/Role checks ใน API ชั้น Service ทำให้ข้อมูลความลับทางโครงสร้างพื้นฐานรั่วไหลสู่ผู้ใช้งานทั่วไป |
| Cascading Deletes & Inconsistent Soft Deletes | Agent 2 (BA), Agent 5 (Data) | **Severe Data Loss**: การตั้งค่า Cascade deletion ในฐานข้อมูลร่วมกับการลบข้อมูลแบบ Hard Delete ใน Service เสี่ยงต่อการสูญหายของประวัติสินทรัพย์และข้อมูลอ้างอิงที่ไม่สามารถกู้คืนได้ |
| Unhandled Database Constraints Crashes | Agent 3 (QA), Agent 5 (Data) | **System Instability & UX Failure**: ขาดชั้นแปลผล Exception (Global Error Mapping) ระหว่าง Database layer และ Controller ทำให้ผู้ใช้เจอข้อผิดพลาด HTTP 500 เมื่อเกิด FK violation หรือ Duplicate keys |
| Unbounded API Queries & Performance Bottlenecks | Agent 2 (BA), Agent 5 (Data) | **DoS & Slowdown Risk**: การไม่จำกัดเพดาน Pagination ใน API ผนวกกับการขาด Indexes ในฟิลด์ Foreign Key ของตาราง Ticket/Asset ทำให้เกิด Full Table Scan และระบบหน่วงเมื่อข้อมูลเติบโต |

---

### Recommended Sprint Plan
**Sprint 1 (Pre-deploy blockers):**
- [ ] ถอดฟิลด์รหัสผ่าน (`guestAccounts.password`, `encryptedPassword`) ออกจาก API response ปกติทั้งหมด และบังคับใช้ `@Roles(Role.ADMIN, Role.EDITOR)` ใน VM และ Credential endpoints
- [ ] แก้ไข Prisma Schema เปลี่ยน `onDelete: Cascade` ของ `Asset.parent`, `VmGuestAccount` และ `Ticket` เป็น `Restrict` หรือ `SetNull` และทำ Migration
- [ ] ปรับแก้ `users.service.ts` ให้ใช้ Soft Delete (`update({ where: { id }, data: { deletedAt: new Date() } })`) แทนการใช้ `.delete()`
- [ ] อัปเดต `GlobalExceptionFilter` ให้ดักจับ Prisma Errors (`P2002`, `P2025`, `P2003`) และคืนค่า HTTP Status 400, 404, 409 พร้อมข้อความที่เข้าใจง่าย
- [ ] เพิ่ม `@UseGuards(RolesGuard)` และ `@Roles` ใน `ClientsController`, `PATCH /api/tickets/:id` และ Credential endpoints
- [ ] สร้างไฟล์ `app/error.tsx` ป้องกัน Root Layout ล่ม และสร้าง Component `AccessDenied` แสดงผลแทนหน้าจอขาวโล่งใน `/dashboard/users` และ `/dashboard/audit-logs`
- [ ] ถอดค่า fallback `'super-secret-key'` ใน `jwt.strategy.ts` ออก และกำหนดให้ระบบ throw error ทันทีตอนบูตหากไม่พบ `JWT_SECRET` ใน Environment Variables

**Sprint 2 (High priority):**
- [ ] ปรับสิทธิ์ `TicketsController` ให้ผู้ใช้งานทุก Role (รวมถึง VIEWER) สามารถเปิด Ticket แจ้งปัญหา IT Service Desk ได้
- [ ] เพิ่ม Validation DTO (`@MaxLength`, `@IsIP()`, ตรวจสอบ Port Range 1-65535) และป้องกัน XSS ในฟิลด์รับข้อความ
- [ ] เพิ่ม Database Transaction และ Optimistic Locking (`@updatedAt`) ใน `AssetsService.update`, `ClientsService` และ `TicketsService.generateTicketNo`
- [ ] บังคับใช้ Pagination และจำกัด Limit สูงสุดต่อรีเควสต์ (Max 200 รายการ) ในตาราง Tickets, VMs, Databases และ Audit Logs
- [ ] เพิ่ม Database Indexes สำหรับ `Ticket.assetId`, `Ticket.vmId`, `TicketComment.ticketId` และปรับปรุง Composite Index ของ `IPAllocation`
- [ ] ปรับฟอร์ม `VmFormDialog`, `DatabaseFormDialog` และ `Ticket` ให้ใช้ Zod + React Hook Form แสดงข้อความแจ้งเตือนสีแดงใต้ช่อง Input
- [ ] เพิ่ม Authentication Guard ป้องกันการเข้าถึงไฟล์แนบใน `/api/assets/uploads/:filename` จากภายนอกโดยไม่ล็อกอิน

**Backlog:**
- [ ] เพิ่มไฟล์ `loading.tsx` และ Skeleton Skeletons ในเส้นทาง `/dashboard/tickets`, `/dashboard/docs` และ `/dashboard/profile`
- [ ] ปรับพฤติกรรมเมนูด้านข้างใน `AppSidebar.tsx` ไม่ให้ยุบตัว (Collapse) เมื่อคลิกซ้ำที่เมนูเดิมที่ Active อยู่
- [ ] ปรับฟิลด์ `environment`, `status` และ `syncState` ในตาราง `Asset`, `DatabaseInventory` ให้ใช้ Enum มาตรฐานกลางแทน String
- [ ] พัฒนาระบบ Cron Job แจ้งเตือนล่วงหน้าเมื่อสินทรัพย์ใกล้หมดประกัน (`warrantyExpiration`) หรือถึงกำหนด End of Life (`eolDate`)
- [ ] เขียนชุดทดสอบ Integration Tests และ E2E Tests ครอบคลุม Core API Flows และ RBAC Permissions ใน CI/CD Pipeline

---

### Items to Remove / Descope
- [Asset Lifecycle Request & Approval Workflow] → [ระบบคำขอเบิกใช้และการอนุมัติสินทรัพย์มีความซับซ้อนเกินไปสำหรับ MVP (Scope Creep) ควรตัดออกใน Release แรกเพื่อเร่งขึ้นระบบ Core Inventory]
- [CSV Export DOM Manipulation Code] → [ลบโค้ดสร้างแท็ก `<a download>` ปลอมแทรกลงใน `document.body` ของฟังก์ชัน Export ออก เนื่องจากซ้ำซ้อน เสี่ยงต่อ Popup Blockers และควรแทนที่ด้วย Utility Function กลางที่กระชับกว่า]
- [Hardcoded JWT Secret Fallback String (`'super-secret-key'`)] → [ลบข้อความ Fallback ลับในโค้ดออกทันที เพื่อป้องกันความหละหลวมด้านความปลอดภัยในกรณีที่ลืมตั้งค่า Environment Variables บนเซิร์ฟเวอร์ Production]
