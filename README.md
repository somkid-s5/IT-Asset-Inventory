# AssetOps (InfraPilot)

**AssetOps** เป็นระบบบริหารจัดการทรัพยากรไอที (IT Asset Inventory) ระดับองค์กรที่ออกแบบมาเพื่อรวบรวมข้อมูลโครงสร้างพื้นฐานทั้งหมดไว้ในที่เดียว ไม่ว่าจะเป็นอุปกรณ์ฮาร์ดแวร์, ฐานข้อมูล, เครื่องเสมือน (VMs), และข้อมูลการเข้าถึง (Credentials) ที่มีการเข้ารหัสอย่างปลอดภัย

---

## ✨ ฟีเจอร์หลัก (Core Features)

### 🖥️ การจัดการสินทรัพย์ (Asset Management)
*   **Asset Hierarchy:** รองรับการจัดเก็บข้อมูลแบบโครงสร้างต้นไม้ (Parent-Child) เช่น Server ภายในตู้ Rack
*   **Multi-Node Support:** จัดการ IP หลายชุด (Management, IPMI, VIP) ภายใต้ Asset เดียวกัน
*   **Patch & Lifecycle:** ติดตามเวอร์ชันปัจจุบัน, วันหมดอายุ (EOL), และประวัติการ Patch
*   **Flexible Metadata:** รองรับการเก็บข้อมูลเพิ่มเติมในรูปแบบ JSON

### 🗄️ คลังฐานข้อมูล (Database Inventory)
*   **Engine Tracking:** รองรับ SQL Server, Oracle, PostgreSQL, MySQL และอื่นๆ
*   **Account Management:** จัดเก็บชื่อผู้ใช้และรหัสผ่านที่เข้ารหัส (Encrypted) พร้อมระบุสิทธิ์ (Privileges)
*   **Environment Aware:** แยกข้อมูลตามสถานะ PROD, UAT, TEST หรือ DEV

### ☁️ การจัดการเครื่องเสมือน (VM Management)
*   **vCenter Integration:** เชื่อมต่อและดึงข้อมูลโดยตรงจาก vCenter (Discovery Mode)
*   **Lifecycle State:** ติดตามสถานะตั้งแต่ Draft, Active ไปจนถึง Archived หรือ Deleted
*   **Sync & Drift Detection:** ตรวจสอบความแตกต่างของข้อมูลระหว่างระบบจริงกับฐานข้อมูล Inventory

### 🔐 ความปลอดภัยและการตรวจสอบ (Security & Audit)
*   **Role-Based Access Control (RBAC):** กำหนดสิทธิ์ผู้ใช้เป็น Admin, Editor หรือ Viewer
*   **Credential Encryption:** รหัสผ่านทั้งหมดถูกเข้ารหัสด้วย AES-256-GCM พร้อม Dynamic IV ก่อนลงฐานข้อมูล
*   **Audit Logging:** บันทึกทุกกิจกรรมสำคัญ เช่น การดูรหัสผ่าน, การ Login หรือการแก้ไขข้อมูล
*   **Production Hardening:** ระบบถูกปรับปรุงให้ปิดพอร์ตฐานข้อมูลจากภายนอก, หมุนเวียน Secrets ที่แข็งแกร่ง และมี Global Exception Filter เพื่อความปลอดภัยระดับสูง

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

### Frontend
*   **Next.js 16** (App Router)
*   **React 19**
*   **Tailwind CSS v4** (Modern CSS Engine)
*   **Shadcn UI** & **Lucide React**
*   **TanStack Query v5** (Data Fetching)

### Backend
*   **NestJS 11** (Enterprise Node.js Framework)
*   **Prisma ORM** (Type-safe Database Access)
*   **PostgreSQL 15**
*   **Passport.js & JWT** (Cookie-based Authentication)
*   **Security Features:** Helmet, Rate Limiting, Global Exception Filter

---

## 🚀 การเริ่มต้นใช้งาน (Getting Started)

### การติดตั้งสำหรับนักพัฒนา (Development)
1.  **Clone Repository:**
    ```bash
    git clone <URL_REPO>
    cd IT-Asset-Inventory
    ```
2.  **Setup Backend:**
    ```bash
    cd backend && npm install
    cp .env.example .env # ตั้งค่า DATABASE_URL และ SECRET ต่างๆ
    npx prisma migrate dev
    npm run start:dev
    ```
3.  **Setup Frontend:**
    ```bash
    cd ../frontend && npm install
    npm run dev
    ```

### การติดตั้งสำหรับใช้งานจริง (Production)
เรามีคู่มือฉบับละเอียดสำหรับการติดตั้งผ่าน **Docker** และการตั้งค่า **Nginx Reverse Proxy** สามารถดูได้ที่:
👉 **[คู่มือการติดตั้ง Production (DEPLOYMENT_GUIDE.md)](./DEPLOYMENT_GUIDE.md)**

---

## 🔑 บัญชีผู้ใช้เริ่มต้น (Default Access)
หลังจากการรัน `npx prisma db seed`:
*   **Username:** `admin`
*   **Password:** `ChangeMe#Admin2026!` *(กรุณาเปลี่ยนทันทีหลังเข้าใช้งาน)*

---

## 📂 โครงสร้างโปรเจกต์
*   `backend/`: ซอร์สโค้ด NestJS, Prisma Schema และ Migrations
*   `frontend/`: ซอร์สโค้ด Next.js และ UI Components (Tailwind v4)
*   `ui_cape/`: ภาพสกรีนช็อตตัวอย่างการใช้งานระบบ

---

## 📄 ใบอนุญาต (License)
UNLICENSED (ลิขสิทธิ์เฉพาะภายในองค์กร)
