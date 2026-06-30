## 🗄️ DATA INTEGRITY REPORT

### Schema / Model Issues
| Table/Model | Field | Issue | Risk Level |
|-------------|-------|-------|-----------|
| User | deletedAt | มีฟิลด์รองรับ Soft Delete ใน Schema แต่โค้ดใน users.service.ts สั่ง user.delete() แบบ Hard Delete ทำให้เสี่ยงต่อ foreign key violation หรือข้อมูลประวัติสูญหาย | Critical |
| Asset | parentId | ความสัมพันธ์ parent-child ใช้ onDelete: Cascade หากลบ Asset แม่ (เช่น Rack หรือ Host) จะลบ Asset ลูกทั้งหมดในระบบทิ้งทันที | Critical |
| VmGuestAccount | discoveryId / inventoryId | ผูกความสัมพันธ์กับทั้ง VmDiscovery และ VmInventory แบบ onDelete: Cascade หากลบหรือ promote discovery บัญชี guest account อาจถูกลบหายไปจาก inventory | Critical |
| Ticket | assetId / vmId / clientId | ไม่มีการระบุ onDelete rule หากลบ Asset, VM หรือ Client ที่มีประวัติตั๋วอ้างอิงอยู่ DB จะ throw Foreign Key violation (P2003) | Critical |
| Asset | assetId | กำหนดเป็น String? @unique ทำให้ฟิลด์บาร์โค้ดหรือรหัสทรัพย์สินสามารถเป็น null ได้ อาจทำให้เกิดข้อมูลทรัพย์สินที่ไม่มีรหัสติดตาม | Low |
| DatabaseInventory | status | กำหนดเป็น DatabaseStatus? @default(ACTIVE) การอนุญาตให้รับค่า null ทำให้ query กรองสถานะทำงานผิดพลาด | High |
| Asset / DatabaseInventory | environment | ใช้ String? แทนที่จะใช้ enum VmEnvironment ทำให้ค่า environment ของระบบไม่เป็นมาตรฐานเดียวกัน | Medium |

### Relation & Cascade Rules
| Relation | onDelete | onUpdate | Correct? | Risk |
|----------|----------|----------|----------|------|
| Asset.createdByUser -> User | Restrict (Default) | Cascade (Default) | No | Critical |
| Asset.parent -> Asset | Cascade | Cascade (Default) | No | Critical |
| VmGuestAccount.discovery -> VmDiscovery | Cascade | Cascade (Default) | No | Critical |
| Ticket.asset -> Asset | Restrict (Default) | Cascade (Default) | No | Critical |
| Ticket.vm -> VmInventory | Restrict (Default) | Cascade (Default) | No | Critical |
| Ticket.client -> Client | Restrict (Default) | Cascade (Default) | No | Critical |
| AuditLog.user -> User | SetNull | Cascade (Default) | Yes | Low |
| IPAllocation.asset -> Asset | Cascade | Cascade (Default) | Yes | Low |
| Credential.asset -> Asset | Cascade | Cascade (Default) | Yes | Low |
| VmInventory.discovery -> VmDiscovery | SetNull | Cascade (Default) | Yes | Low |

### Transaction Safety
| Operation | Atomic? | Rollback Handled? | Risk |
|-----------|---------|-------------------|------|
| Create Ticket (tickets.service.ts) | No | No | High |
| Sync vCenter Data (vm.service.ts) | Yes (Monolithic) | Yes | High |
| Create Asset + AuditLog (assets.service.ts) | No | No | High |
| Delete Asset + AuditLog (assets.service.ts) | No | No | High |
| Create Database + Accounts (databases.service.ts) | No | No | High |
| Update User Role + AuditLog (users.service.ts) | No | No | High |
| Promote VM Discovery (vm.service.ts) | Yes | Yes | Low |

### Null / Default Value Issues
- DatabaseInventory.status -> DatabaseStatus? @default(ACTIVE) -> DatabaseStatus @default(ACTIVE) -> ป้องกันการบันทึกค่า null เพื่อให้ index และ query กรองสถานะทำงานได้อย่างถูกต้อง
- Asset.environment -> String? -> VmEnvironment? -> ปรับไปใช้ Enum กลางเพื่อให้ข้อมูลสภาพแวดล้อม (PROD, TEST, UAT) สอดคล้องกันทั้งระบบ
- DatabaseInventory.environment -> String? -> VmEnvironment? -> ปรับไปใช้ Enum กลางลดปัญหาการพิมพ์ค่า free-text ไม่ตรงกัน
- VmInventory.syncState -> String -> VmSyncState @default(SYNCED) -> ควรเปลี่ยนจาก String ทั่วไปเป็น Enum เพื่อควบคุมสถานะการซิงค์ข้อมูลให้เสถียร
- TicketComment.commentType -> String @default("GENERAL") -> TicketCommentType @default(GENERAL) -> เปลี่ยนเป็น Enum เพื่อควบคุมประเภทคอมเมนต์ (GENERAL, INVESTIGATION, ACTION, RESOLUTION)

### Missing Indexes
- Ticket.assetId -> Query ค้นหาตั๋วตาม Asset ในหน้ารายละเอียดทรัพย์สิน -> Full table scan เมื่อข้อมูลตั๋วเพิ่มขึ้น ส่งผลให้หน้า UI โหลดช้า
- Ticket.vmId -> Query ค้นหาตั๋วตาม VM Inventory -> Full table scan ทำให้คอขวดเมื่อแสดงประวัติปัญหาของ VM
- TicketComment.ticketId -> Query ดึงรายการคอมเมนต์ทั้งหมดของตั๋วแต่ละใบ -> Full table scan ทำให้เปิดรายละเอียดตั๋วช้ามากเมื่อมีคอมเมนต์จำนวนมาก
- VmGuestAccount.inventoryId -> Query ค้นหาบัญชีผู้ใช้ในเครื่อง VM แต่ละตัว -> Full table scan ทำให้โหลดแท็บ Credentials ของ VM ช้า
- AssetNote.assetId -> Query ดึงโน้ตทั้งหมดของทรัพย์สิน -> Full table scan ทำให้หน้า Asset Detail ตอบสนองช้า
- AssetAttachment.assetId -> Query ดึงไฟล์แนบของทรัพย์สิน -> Full table scan ทำให้การดึงรายการไฟล์แนบหน่วง
- IPAllocation.assetId -> Query ดึงรายการ IP ของทรัพย์สินโดยใช้ assetId เป็นเงื่อนไขหลัก -> Composite index [address, assetId] ในปัจจุบันใช้ address เป็น leading column ทำให้ค้นหาด้วย assetId อย่างเดียวไม่ได้ประสิทธิภาพ

### Enum Consistency
| Enum | Values | Business Match | Status |
|------|--------|---------------|--------|
| AssetStatus | ACTIVE, INACTIVE, MAINTENANCE, DECOMMISSIONED | Match | OK |
| DatabaseStatus | ACTIVE, INACTIVE, MAINTENANCE | Mismatch | Missing DECOMMISSIONED or ARCHIVED |
| VmEnvironment | PROD, TEST, UAT | Match | Should apply to Asset and DatabaseInventory |
| VmLifecycleState | DRAFT, ACTIVE, DELETED_IN_VCENTER, ARCHIVED | Match | OK |
| TicketStatus | OPEN, IN_PROGRESS, WAITING_FOR_CLIENT, RESOLVED, CLOSED | Match | OK |
| AuditAction | 29 actions | Partial Match | Missing PROMOTE_VM action |

### Severity Summary
- Critical: 4 items
- High: 5 items
- Medium: 6 items
- Low: 3 items
