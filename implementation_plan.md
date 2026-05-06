# Project SysAdmin Desk: Master Technical Implementation Plan

เป้าหมายคือการยกระดับโปรเจกต์ `IT-Asset-Inventory` เดิม ให้กลายเป็นระบบ **SysAdmin Desk** (ITSM Platform) แบบครบวงจร โดยแผนนี้จะเป็นการระบุรายละเอียดเชิงลึก (Technical Design) เพื่อให้เห็นภาพรวมทั้งหมดก่อนลงมือเขียนโค้ดจริง

## ⚠️ User Review Required
> [!IMPORTANT]  
> โปรดตรวจสอบ **"ส่วนที่ 3: การแก้ไขหน้าจอเดิม (Existing UI Modifications)"** ว่าตรงกับความต้องการที่จะให้ระบบ Asset เดิมเชื่อมโยงกับระบบ Ticket ใหม่หรือไม่

---

## 1. Database Schema Design (Prisma)
รายละเอียดการแก้ไขไฟล์ `backend/prisma/schema.prisma`

### 1.1 เพิ่ม Enum ใหม่
```prisma
enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum TicketStatus {
  OPEN
  IN_PROGRESS
  WAITING_FOR_CLIENT
  RESOLVED
  CLOSED
}
```

### 1.2 เพิ่ม Model ใหม่
```prisma
model Client {
  id        String   @id @default(uuid())
  name      String   @unique // เก็บชื่อลูกค้า/บริษัท ป้องกันการพิมพ์ซ้ำซ้อน
  tickets   Ticket[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Ticket {
  id          String         @id @default(uuid())
  ticketNo    String         @unique // เลขที่ตั๋วรันออโต้ (เช่น SD-2605-001)
  title       String
  description String?
  priority    TicketPriority @default(MEDIUM)
  status      TicketStatus   @default(OPEN)

  clientId    String
  client      Client         @relation(fields: [clientId], references: [id])
  
  assetId     String?        // (Optional) ผูกกับ Asset/VM เดิม
  asset       Asset?         @relation(fields: [assetId], references: [id])

  assigneeId  String?        // Admin ที่รับผิดชอบ
  assignee    User?          @relation("AssignedTickets", fields: [assigneeId], references: [id])

  creatorId   String         // Manager/User ที่สร้างตั๋ว
  creator     User           @relation("CreatedTickets", fields: [creatorId], references: [id])

  comments    TicketComment[]

  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  resolvedAt  DateTime?      // เวลาที่แก้เสร็จ (ใช้วัด SLA)
}

model TicketComment {
  id        String   @id @default(uuid())
  ticketId  String
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  content   String   // ข้อความอัปเดตงาน
  isSystem  Boolean  @default(false) // แยกคอมเมนต์แอดมิน กับ ข้อความระบบ (เช่น "เปลี่ยนสถานะเป็น In Progress")
  createdAt DateTime @default(now())
}

model KnowledgeCategory {
  id          String             @id @default(uuid())
  name        String             @unique
  icon        String?            // ชื่อ Icon จาก Lucide
  articles    KnowledgeArticle[]
}

model KnowledgeArticle {
  id          String            @id @default(uuid())
  title       String
  content     String            // เก็บแบบ Markdown
  categoryId  String
  category    KnowledgeCategory @relation(fields: [categoryId], references: [id])
  authorId    String
  author      User              @relation(fields: [authorId], references: [id])
  viewCount   Int               @default(0)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}
```

### 1.3 แก้ไข Model เดิมที่มีอยู่
ต้องไปเพิ่มบรรทัดเหล่านี้ใน Model เดิมเพื่อให้ Relational DB สมบูรณ์:
- **ใน `model User`:** 
  ```prisma
  assignedTickets  Ticket[] @relation("AssignedTickets")
  createdTickets   Ticket[] @relation("CreatedTickets")
  ticketComments   TicketComment[]
  writtenArticles  KnowledgeArticle[]
  ```
- **ใน `model Asset`:**
  ```prisma
  tickets Ticket[]
  ```

---

## 2. Backend Architecture (NestJS)
จะมีการสร้าง 4 Modules หลักผ่านคำสั่ง `nest g resource ...`

### 2.1 TicketsModule (`backend/src/tickets`)
- **Controller Endpoints:**
  - `GET /tickets` (List พร้อม Pagination, Filter สถานะ/คนรับผิดชอบ)
  - `POST /tickets` (สร้าง Ticket ใหม่ จะมีการเช็คชื่อ Client ถ้าไม่มีให้สร้างในตาราง Client อัตโนมัติ)
  - `GET /tickets/:id` (ดูรายละเอียด)
  - `PATCH /tickets/:id/status` (เปลี่ยนสถานะ)
  - `PATCH /tickets/:id/assign` (กดรับงาน/โอนงาน)
- **Service Logic:**
  - การรันเลข `ticketNo` อัตโนมัติในรูปแบบ `SD-YYMM-XXX` (SysAdmin Desk - ปีเดือน - ลำดับ)

### 2.2 TicketCommentsModule (`backend/src/ticket-comments`)
- **Endpoints:** `POST /tickets/:id/comments`, `GET /tickets/:id/comments`

### 2.3 ClientsModule (`backend/src/clients`)
- **Endpoints:** `GET /clients/search?q=...` (สำหรับทำ Autocomplete ที่หน้าบ้าน)

### 2.4 KnowledgeBaseModule (`backend/src/knowledge-base`)
- **Endpoints:** CRUD สำหรับ Category และ Article

### 2.5 NotificationsModule (`backend/src/notifications`)
- สร้าง `LineNotifyService`
- ผูก Logic เข้ากับ `TicketsService`:
  - *Trigger 1:* เมื่อสร้าง Ticket ใหม่ ส่งข้อความเข้ากลุ่ม "🆕 งานใหม่: [ชื่อตั๋ว] จาก: [ชื่อลูกค้า]"
  - *Trigger 2:* เมื่อ Assign งาน ส่งข้อความ "👤 งาน [เลขตั๋ว] ถูกรับผิดชอบโดย @[ชื่อพนักงาน]"
  - *Trigger 3:* เมื่อเปลี่ยน Status เป็น Resolved ส่งข้อความ "✅ ปิดงาน: [เลขตั๋ว]"

---

## 3. Frontend UI/UX Design (Next.js + shadcn/ui)

### 3.1 การแก้ไขหน้าจอเดิม (Existing UI Modifications)
1. **Sidebar/Navigation (`frontend/components/layout/sidebar.tsx`):**
   - เพิ่มเมนู "🎫 Helpdesk / Tickets"
   - เพิ่มเมนู "📚 Knowledge Base"
2. **Asset Detail Page (`frontend/app/assets/[id]/page.tsx`):**
   - เพิ่ม Tab ถัดจาก "Details" และ "Notes" ชื่อว่า **"Ticket History"**
   - เมื่อกด Tab นี้ จะ Fetch ข้อมูล Ticket ทั้งหมดที่ผูกกับ `assetId` นี้มาแสดงเป็นตารางเล็กๆ เพื่อให้รู้ประวัติการซ่อมบำรุง

### 3.2 สร้างหน้าจอใหม่ (New UI Modules)

#### 📝 หน้า Ticket Dashboard (`/tickets`)
- **หน้าตา (UI):** ด้านบนมี Card สรุป (สี่เหลี่ยม 4 ช่อง) แสดงตัวเลขงาน Open, In Progress, Resolved
- **Filter Bar:** มี Dropdown กรองสถานะ, กรองความด่วน, และปุ่ม "Assign to Me"
- **Data Table:** ใช้ `@tanstack/react-table` (มีอยู่แล้ว) แสดงคอลัมน์: เลขตั๋ว, หัวข้อ, ลูกค้า, สถานะ (ใช้ Badge สีต่างๆ), ความด่วน, และคนรับผิดชอบ

#### 📝 หน้าสร้าง Ticket ใหม่ (`/tickets/new`)
- **รูปแบบฟอร์ม:** แบ่งเป็น 2 คอลัมน์ (ซ้ายข้อมูลหลัก, ขวาข้อมูลประกอบ)
- **ส่วนประกอบพิเศษ:**
  - **ช่อง Client Name:** ใช้ `Command` + `Popover` (จาก shadcn) ทำหน้าที่เป็น **Autocomplete** พิมพ์แล้วดึงรายชื่อลูกค้าเดิมมาโชว์ ถ้าพิมพ์ชื่อใหม่ที่ไม่มีในระบบ จะมีปุ่มบอกว่า `Create new client: "..."`
  - **ช่อง Related Asset:** Autocomplete ค้นหา Asset ด้วยชื่อ หรือ IP (ส่ง API ค้นหาไปยัง Asset Module)

#### 📝 หน้า Ticket Detail / Workspace (`/tickets/[id]`)
- **Layout:** แบ่งจอ ซ้าย 70% (เนื้อหา), ขวา 30% (Metadata)
- **ฝั่งซ้าย (Main Area):**
  - แสดงหัวข้อและรายละเอียดปัญหา
  - แสดง **Timeline / Comments:** เรียงลงมาเหมือนแชท จะมีทั้งข้อความอัปเดตจากระบบ (พื้นหลังสีเทา) และคอมเมนต์จากแอดมิน (ใส่กล่องสวยงาม)
  - กล่อง Textarea สำหรับพิมพ์อัปเดตงานด้านล่าง
- **ฝั่งขวา (Sidebar):**
  - แสดง Status (มี Dropdown ให้เปลี่ยนสถานะได้ทันที)
  - แสดง Assignee (มีปุ่มโอนงานให้คนอื่น)
  - แสดงชื่อ Client และชื่อ Asset ที่ผูกอยู่ (สามารถคลิกชื่อ Asset เพื่อเด้งกลับไปหน้า Asset Detail ได้)

#### 📚 หน้า Knowledge Base (`/docs`)
- **หน้า Index:** ออกแบบเป็น **Card Grid** แบ่งตามหมวดหมู่ (Network, Server, Software) มี Icon ประกอบ
- **หน้ารายการบทความ (`/docs/category/[id]`):** ลิสต์รายชื่อคู่มือ พร้อมช่อง Search ค้นหา
- **หน้าอ่านบทความ (`/docs/article/[id]`):** 
  - ใช้ `react-markdown` ผสมกับ `@tailwindcss/typography` (`prose` class) เพื่อให้ตาราง ตัวหนา และ Code block แสดงผลได้สวยงามเหมือนอ่าน Blog

---

## 4. แผนการดำเนินการ (Execution Phases)
เพื่อไม่ให้กระทบระบบเดิมที่รันอยู่ การทำงานจะแบ่งเป็น 4 เฟส:

1. **Phase 1: Foundation (Database & API Base)**
   - อัปเดต `schema.prisma` สั่ง Generate และ Push
   - สร้าง Backend Modules (Tickets, Clients, KB) และทำ CRUD API ให้ครบ ทดสอบด้วย Swagger
2. **Phase 2: Frontend Ticketing System**
   - สร้างฟอร์มสร้างตั๋ว (ทำระบบ Autocomplete Client / Asset)
   - สร้างหน้า Dashboard
   - สร้างหน้า Ticket Detail และระบบ Comment
3. **Phase 3: Frontend Knowledge Base**
   - สร้างหน้าแสดงหมวดหมู่และบทความ Markdown
   - สร้างฟอร์มให้แอดมินเขียนบทความใหม่
4. **Phase 4: Integration & Polish**
   - เชื่อมระบบ Line Notify เข้ากับ Backend
   - กลับไปแก้ไขหน้า Asset Detail ของเดิม ให้แสดงแถบ Ticket History
   - เก็บกวาด UI และทำ Validation (zod) ให้แน่นหนา

## Verification Plan
1. **Database:** สั่งรัน `npx prisma db push` ต้องผ่าน 100% โดยไม่มี Warning เรื่อง Data Loss 
2. **Backend:** ทดสอบยิง API ด้วย CWD หรือ Postman ระบบต้อง Gen รหัสตั๋วอัตโนมัติได้
3. **Frontend:** 
   - ระบบ Autocomplete ต้องไม่มีอาการกระตุกตอน Fetch ข้อมูล
   - หน้า Ticket Detail เมื่อกด "เปลี่ยนสถานะ" หน้าจอต้องอัปเดตทันที (Optimistic Update)
4. **Integration:** นำ Token Line ทดสอบมาใส่ เมื่อกด Save ตั๋วบนเว็บ ต้องมีข้อความเด้งเข้ามือถือภายใน 1 วินาที
