# 🛰️ InfraPilot: IT Asset and Patch Intelligence Platform

**InfraPilot** คือแพลตฟอร์มรวมศูนย์สำหรับบริหารจัดการสินทรัพย์ไอที (IT Asset Management) ออกแบบมาเพื่อให้ทีม IT สามารถติดตามข้อมูลโครงสร้างพื้นฐาน, จัดเก็บรหัสผ่านอย่างปลอดภัย (Credential Vault), และวิเคราะห์ความเสี่ยงของระบบ (Risk Scoring) ได้อย่างมีประสิทธิภาพในที่เดียว

---

## 🌟 ฟีเจอร์หลัก (Core Features)

*   **🖥️ IT Asset Inventory:** จัดการเซิร์ฟเวอร์ (Physical/VM), แอปพลิเคชัน, และฐานข้อมูล รองรับการเก็บ Metadata แบบยืดหยุ่น (Flexible Metadata) ไม่จำกัดรูปแบบ
*   **🔗 Hierarchical Relationship:** แสดงความสัมพันธ์ระหว่างระบบแบบลำดับชั้น (เช่น VM รันอยู่บน Host ไหน หรือ App ใช้ DB ตัวไหน)
*   **🔐 Secure Credential Vault:** จัดเก็บรหัสผ่านและคีย์สำคัญด้วยการเข้ารหัส **AES-256-GCM** (ระดับมาตรฐานธนาคาร) พร้อมระบบตรวจสอบประวัติการเข้าชม (Audit Logs)
*   **📊 Infrastructure Risk Scoring:** คำนวณคะแนนความเสี่ยงอัตโนมัติจากสถานะประกัน (Warranty), ซอฟต์แวร์หมดอายุ (EOL), และประวัติการแพตช์ (Patching)
*   **📡 Network IP Management:** รองรับการจัดสรร IP Address หลายรายการต่อหนึ่ง Asset (Multiple IP Allocation)
*   **📅 Patch & EOL Tracking:** ระบบติดตามเวอร์ชันซอฟต์แวร์และแจ้งเตือนวันหมดอายุการสนับสนุน (End-of-Life)

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

### Frontend
- **Framework:** Next.js 15+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + [shadcn/ui](https://ui.shadcn.com/)
- **Icons:** Lucide React

### Backend
- **Framework:** NestJS (Node.js)
- **ORM:** Prisma ORM
- **Authentication:** JWT (JSON Web Token) + Passport.js
- **Security:** bcrypt (Password hashing), crypto (AES-256-GCM for Vault)

### Infrastructure
- **Database:** PostgreSQL 15
- **Container:** Docker & Docker Compose
- **Tooling:** PgAdmin 4 (Database Management)

---

## 🚀 วิธีการติดตั้งและเริ่มใช้งาน (Getting Started)

### 1. ความต้องการของระบบ (Prerequisites)
- [Node.js](https://nodejs.org/) (เวอร์ชัน 20 หรือใหม่กว่า)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (สำหรับรัน Database)
- Git

### 2. เตรียมฐานข้อมูล (Database)
ใช้ Docker Compose เพื่อเริ่มการทำงานของ PostgreSQL:
```bash
docker-compose -f docker-compose.prod.yml up -d postgres pgadmin
```
*PgAdmin จะเข้าใช้งานได้ที่: http://localhost:5050 (User: admin@infrapilot.com / Pass: admin123)*

### 3. ตั้งค่าสภาพแวดล้อม (Environment Setup)
สร้างไฟล์ `.env` ในโฟลเดอร์ `backend/`:
```bash
# backend/.env
DATABASE_URL="postgresql://infrapilot:securepassword123@localhost:5432/infrapilot_db?schema=public"
JWT_SECRET="super-secret-jwt-key-change-me-in-prod"
ENCRYPTION_KEY="12345678123456781234567812345678"
PORT=3001
```

### 4. เตรียมโค้ดและข้อมูล (Install & Seed)
```bash
# ติดตั้ง Backend และเตรียม DB
cd backend
npm install
npx prisma db push
npx prisma db seed

# ติดตั้ง Frontend
cd ../frontend
npm install
```

---

## 💻 การรันโปรเจคในโหมดพัฒนา (Development)

เปิด Terminal 2 หน้าต่างแยกกัน:

**หน้าต่างที่ 1: Backend API**
```bash
cd backend
npm run start:dev
```
*API จะทำงานที่: http://localhost:3001/api*

**หน้าต่างที่ 2: Frontend UI**
```bash
cd frontend
npm run dev
```
*แอปพลิเคชันจะทำงานที่: http://localhost:3000*

---

## 🔑 ข้อมูลเข้าใช้งานเริ่มต้น (Default Credentials)

| User Role | Email | Password |
| :--- | :--- | :--- |
| **Administrator** | `admin@infrapilot.local` | `admin123` |

---

## 📂 โครงสร้างโฟลเดอร์ (Project Structure)

- `backend/`: NestJS API, Prisma Schema & Seeds
- `frontend/`: Next.js Application, UI Components (shadcn/ui)
- `prisma/`: ไฟล์สำหรับการ Import ข้อมูลจาก CSV/XLSX (ถ้ามี)
- `docker-compose.prod.yml`: การตั้งค่า Docker สำหรับ PostgreSQL/PgAdmin

---

## 📄 ใบอนุญาต (License)
โปรเจคนี้จัดทำขึ้นภายใต้ลิขสิทธิ์เฉพาะ (UNLICENSED) สำหรับการใช้งานภายในองค์กร

---
*พัฒนาโดยทีม InfraPilot - "Mastering your Infrastructure, One Asset at a Time"*
