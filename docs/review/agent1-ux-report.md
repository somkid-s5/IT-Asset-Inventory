## 🎨 UX ANALYST REPORT

### Flow Completeness
| Feature | Start | Process | Feedback | Status |
|---------|-------|---------|----------|--------|
| Authentication (Login) | ✅ | ✅ | ✅ | OK |
| Hardware Assets Inventory | ✅ | ✅ | ❌ | ISSUE |
| Virtual Machines Inventory | ✅ | ✅ | ❌ | ISSUE |
| Database Inventory | ✅ | ✅ | ❌ | ISSUE |
| IT Service Tickets | ✅ | ✅ | ❌ | ISSUE |
| Knowledge Base / Documentation | ✅ | ✅ | ❌ | ISSUE |
| User Access Management | ✅ | ✅ | ❌ | ISSUE |
| Audit Logs | ✅ | ✅ | ❌ | ISSUE |

### Dead-end / Missing States
- [All Dashboard Feature Routes] → [Missing Route-level error.tsx boundary] → [If any render or unhandled runtime error occurs inside sub-routes like /dashboard/tickets or /dashboard/assets, it crashes all the way up to the root app/error.tsx boundary, removing the entire sidebar and layout navigation.]
- [Dashboard List Pages (Assets, VMs, DBs, Users, Tickets, Docs)] → [Missing Error State on API Failure] → [useQuery isError state is ignored across list pages. If backend services fail or network disconnects, tables render empty states ("No assets found") which misleads users into thinking records were deleted.]
- [Admin Pages (/dashboard/users & /dashboard/audit-logs)] → [Missing 403 Access Denied State] → [Non-admin users accessing these routes directly hit `if (!user || user.role !== 'ADMIN') return null;`, resulting in a completely blank white screen without warning or navigation buttons.]
- [Ticket Detail Page (/dashboard/tickets/[id])] → [Missing Styled 404/Empty State] → [When a ticket ID is not found (`!ticket`), the page renders a raw unstyled `<div>Ticket not found</div>` without back buttons or dashboard layout wrapper.]
- [Asset Detail Page (/dashboard/assets/[id])] → [Missing Loading/Error Fallback during Redirect] → [When asset load encounters an error, the component renders `return null;` during the toast and router redirect, displaying a jarring blank screen.]

### Redundant / Illogical UX
- [Sidebar Active Item Collapse] → [ใน AppSidebar.tsx เมื่อผู้ใช้อยู่ที่หน้าปัจจุบันและคลิกลิงก์เมนูเดิมซ้ำ (onClick มี e.preventDefault(); onToggleCollapsed();) เมนูด้านข้างจะถูกย่อปิด (collapse) ทันที ซึ่งผิดความคาดหวังของผู้ใช้ที่มักคลิกเพื่อรีเฟรชหรือเลื่อนขึ้นด้านบน] → [แนะนำแก้ไขให้เปลี่ยนพฤติกรรมเมื่อคลิกลิงก์ที่ active อยู่เป็นการเลื่อนหน้าต่างขึ้นบนสุด (Scroll to top) หรือไม่ทำอะไรเลย แทนการปิดย่อเมนูด้านข้าง]
- [CSV Export DOM Manipulation] → [ในฟังก์ชัน handleExport ของหน้า List สร้างแท็ก `<a download>` ปลอมแทรกใน document.body แล้ว dispatch MouseEvent พร้อมตั้ง setTimeout ลบออก ซึ่งซ้ำซ้อนและเสี่ยงต่อปัญหากับ browser popup blockers] → [แนะนำแก้ไขให้สร้าง utility function กลาง หรือใช้ HTML5 download ทางตรงโดยเรียก link.click() แบบไม่ต้อง appendChild ลงใน body]

### Navigation Issues
- [Inconsistent Route Loading Boundaries] → [เส้นทาง assets, virtual-machines, databases, users และ audit-logs มีไฟล์ loading.tsx แต่เส้นทาง tickets, docs และ profile กลับไม่มีไฟล์ loading.tsx ทำให้ประสบการณ์เปลี่ยนหน้าจอ (Route Transition) ไม่สม่ำเสมอ] → [แนะนำแก้ไขโดยเพิ่มไฟล์ loading.tsx ในโฟลเดอร์ tickets, docs และ profile โดยเรียกใช้ Skeletons กลางของระบบ]
- [Blank Page Trap on Unauthorized Access] → [การจัดการสิทธิ์ในหน้า /dashboard/users และ /dashboard/audit-logs คืนค่า null ทันทีหากไม่ใช่ ADMIN ทำให้ผู้ใช้ติดกับดักในหน้าว่างเปล่า] → [แนะนำแก้ไขโดยเปลี่ยนไปแสดง Component Access Denied พร้อมปุ่ม "Back to Dashboard" หรือ redirect กลับหน้าหลัก]

### Form Validation Issues
- [VmFormDialog & DatabaseFormDialog] → [ฟอร์มเพิ่ม/แก้ไข VM และ Database ตรวจสอบเพียงความว่างเปล่าของ accounts ผ่าน toast.error แต่ไม่ตรวจสอบฟิลด์หลัก (Name, Host, IP) แบบ Real-time หากกรอกผิดจะส่งไปล้มเหลวที่ Backend และแจ้งเตือนเพียง generic toast] → [แนะนำปรับไปใช้ React Hook Form + Zod Schema เหมือนหน้า LoginPage เพื่อแสดงข้อความแจ้งเตือนใต้ช่อง Input แต่ละช่องอย่างชัดเจน]
- [Ticket & KB Document Create Forms] → [ฟอร์มสร้าง Ticket และฟอร์มเขียนเอกสาร KB ตรวจสอบ validation ตอน Submit ด้วยเงื่อนไข `if (!title || ...)` แล้วแจ้งเตือนผ่าน toast.error เท่านั้น โดยไม่ไฮไลต์กรอบสีแดงที่ช่อง Input ที่กรอกไม่ครบ] → [แนะนำเพิ่มสถานะ error state ที่ตัว Input (aria-invalid, border-destructive) เพื่อนำทางสายตาผู้ใช้ไปยังช่องที่ต้องแก้ไข]

### Severity Summary
- Critical: 3 items
- Warning: 4 items
- Info: 2 items
