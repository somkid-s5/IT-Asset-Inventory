## 📊 BUSINESS ANALYST REPORT

### Feature Coverage
| Business Requirement | Implemented | Gap |
|----------------------|-------------|-----|
| Asset Registration & CRUD | ✅ | รองรับการสร้าง อ่าน แก้ไข ลบ และเชื่อมโยงความสัมพันธ์ Parent-Child |
| Asset Lifecycle Request | ❌ | ขาดระบบการส่งคำขอเบิกใช้ครุภัณฑ์ (Asset Request Workflow) จากพนักงานหรือผู้ใช้งานทั่วไป |
| Asset Approval Workflow | ❌ | ขาดขั้นตอนและการอนุมัติ (Approval Process) ในการเบิกใช้ การซ่อมบำรุง หรือการจำหน่ายทิ้ง |
| Asset Assignment & Check-out | ❌ | เก็บเพียงชื่อ `owner` เป็นแบบข้อความ (String) ขาดระบบบันทึกประวัติการมอบหมาย ยืม-คืน และวันครบกำหนด |
| Asset Return & Check-in | ❌ | ขาดกระบวนการรับคืนอุปกรณ์ การตรวจเช็คสภาพ และการปรับสถานะกลับสู่คลังสินทรัพย์กลาง |
| Helpdesk & Incident Ticketing | ✅ | มีระบบ Ticket สำหรับแจ้งปัญหาและผูกกับ Asset/VM แต่ยังจำกัดสิทธิ์เฉพาะระดับ Admin/Editor |
| Automated VM & DB Discovery | ✅ | มีระบบเชื่อมโยงและซิงค์ข้อมูลอินเวนทอรีจาก vCenter และจัดการข้อมูลฐานข้อมูล |

### Missing Business Logic
- [การควบคุมสถานะก่อนลบหรือจำหน่ายสินทรัพย์ (Lifecycle Guardrails)] → [สินทรัพย์ในสถานะ `ACTIVE` หรือมีทรัพย์สินย่อย (Child Assets) ผูกอยู่ สามารถลบทิ้งได้อย่างอิสระโดยไม่ต้องเปลี่ยนสถานะเป็น `DECOMMISSIONED` ส่งผลให้ข้อมูลประวัติและเครือข่ายอ้างอิงสูญหาย]
- [การจำกัดสิทธิ์ผู้ใช้งานระดับ VIEWER ในการสร้างตั๋วแจ้งปัญหา (Service Desk Accessibility)] → [ใน `TicketsController` กำหนดสิทธิ์ `@Roles(Role.ADMIN, Role.EDITOR)` ในการสร้าง Ticket ทำให้พนักงานทั่วไปที่เป็น `VIEWER` ไม่สามารถเปิดตั๋วแจ้งซ่อมหรือขอใช้อุปกรณ์ได้]
- [ช่องโหว่การเปิดเผยรหัสผ่าน VM Guest Accounts โดยไม่บันทึก Audit Log] → [ใน `VmService.mapDiscovery` และ `mapInventory` มีการถอดรหัสผ่าน (`decrypt`) ของ `guestAccounts` และส่งคืนใน API ทั่วไปโดยไม่ผ่านระบบ Reveal Password และไม่มีการบันทึก Audit Log (`VIEW_PASSWORD`)]
- [ระบบแจ้งเตือนการหมดอายุการรับประกันและ EOL (Automated Expiration Alerting)] → [ตาราง `Asset` และ `PatchInfo` เก็บข้อมูล `warrantyExpiration` และ `eolDate` แต่ไม่มี Logic/Cron Job สำหรับแจ้งเตือนผู้บริหารหรือ IT ล่วงหน้า ทำให้เสียโอกาสในการต่อสัญญา MA]

### Auditability Check
- [x] Action log (who, what, when)
- [ ] History/version tracking
- [ ] Export capability
- [ ] Approval audit trail

### Business Edge Cases
- [การดึงข้อมูลจำนวนมากโดยไม่จำกัดเพดาน (Unbounded Query Limit)] → [ในระบบ Tickets, Databases, VM และ Audit Logs ไม่บังคับใช้ Pagination หรือจำกัด Limit สูงสุด] → [ควรบังคับ Pagination และกำหนด Max Limit ต่อรีเควสต์ (เช่น ไม่เกิน 200 รายการ) เพื่อป้องกันปัญหา OOM และระบบหน่วง]
- [การลบสินทรัพย์หลักที่มีสินทรัพย์ย่อยหรือ IP ผูกอยู่ (Cascading Deletion Risk)] → [ระบบตั้งค่า `onDelete: Cascade` ทำให้เมื่อลบ Asset แม่ ข้อมูลลูกและ IP ถูกลบตามทันทีโดยไม่มีคำเตือน] → [ควรเปลี่ยนเป็นการทำ Soft Delete หรือระงับการลบหากยังมีสินทรัพย์ย่อยใช้งานอยู่]
- [การระบุตัวตนผู้ถือครองสินทรัพย์แบบข้อความอิสระ (Unlinked Owner Field)] → [ฟิลด์ `owner` เป็นประเภทข้อความธรรมดา ไม่ได้เชื่อมโยงกับตาราง `User`] → [ควรเปลี่ยนเป็น Foreign Key อ้างอิงตาราง `User` หรือระบบ Directory เพื่อความถูกต้องและตรวจสอบประวัติย้อนหลังได้]

### Asset Lifecycle Coverage
| Status | Transitions | Handled |
|--------|-------------|---------|
| ACTIVE | เปลี่ยนไปเป็น INACTIVE, MAINTENANCE, DECOMMISSIONED | ❌ (เปลี่ยนสถานะข้ามไปมาได้อย่างอิสระ ขาดเงื่อนไขตรวจสอบ State Machine) |
| INACTIVE | เปลี่ยนไปเป็น ACTIVE, MAINTENANCE, DECOMMISSIONED | ❌ (เปลี่ยนสถานะได้ทันทีโดยไม่มีการเก็บบันทึกเหตุผลการหยุดใช้งาน) |
| MAINTENANCE | เปลี่ยนไปเป็น ACTIVE, DECOMMISSIONED | ❌ (ไม่มีการผูกหรือตรวจสอบสถานะงานซ่อมบำรุงจากระบบ Ticket ก่อนกลับมาใช้งาน) |
| DECOMMISSIONED | เปลี่ยนกลับมาเป็น ACTIVE, INACTIVE, MAINTENANCE | ❌ (ระบบอนุญาตให้นำอุปกรณ์ที่จำหน่ายออกแล้วกลับมาเป็น ACTIVE ได้โดยไม่มี Safeguard) |

### Severity Summary
- Critical: 2 items
- High: 3 items
- Nice-to-have: 2 items
