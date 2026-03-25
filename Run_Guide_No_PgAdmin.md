### คู่มือการรันโปรเจค InfraPilot โดยไม่ใช้ PgAdmin

โปรเจค **InfraPilot** ประกอบด้วย 3 ส่วนหลักคือ: **Database (PostgreSQL)**, **Backend (NestJS)**, และ **Frontend (Next.js)** 
หากต้องการรันโดยไม่ต้องเปิดใช้งาน PgAdmin สามารถทำตามขั้นตอนด้านล่างนี้:

#### ขั้นตอนที่ 1: รันเฉพาะ Database (PostgreSQL) ผ่าน Docker
เปิด Terminal ให้อยู่ที่โฟลเดอร์โปรเจคหลัก แล้วสั่งรันเฉพาะ Service ชื่อ `postgres` (ไม่ระบุ `pgadmin` ต่อท้ายเพื่อไม่ให้มันรันขึ้นมา)
```bash
docker-compose -f docker-compose.prod.yml up -d postgres
```

#### ขั้นตอนที่ 2: ตั้งค่า Environment (.env) สำหรับ Backend
สร้างไฟล์ `.env` ไว้ในโฟลเดอร์ `backend/` (สามารถคัดลอกไฟล์จาก `.env.example` ก็ได้) โดยใส่ข้อมูลดังนี้:
```env
DATABASE_URL="postgresql://infrapilot:ChangeMe%23Postgres2026!@localhost:5432/infrapilot_db?schema=public"
JWT_SECRET="ChangeMe-JWT-Secret-2026-Long-Random-Value"
CREDENTIAL_ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
DEFAULT_ADMIN_PASSWORD="ChangeMe#Admin2026!"
DEFAULT_EDITOR_PASSWORD="ChangeMe#Editor2026!"
PORT=3001
```

#### ขั้นตอนที่ 3: ติดตั้งและรัน Backend API
เปิด Terminal หน้าต่างแรก (เข้าไปที่โฟลเดอร์ `backend`):
```bash
cd backend
npm install
npx prisma db push
npx prisma db seed
npm run start:dev
```
*รอจนกว่าจะรันเสร็จ โดย Backend จะเริ่มทำงานที่: `http://localhost:3001/api`*

#### ขั้นตอนที่ 4: ติดตั้งและรัน Frontend UI
เปิด Terminal หน้าต่างที่ 2 (เข้าไปที่โฟลเดอร์ `frontend`):
```bash
cd frontend
npm install
npm run dev
```
*Frontend จะทำงานและสามารถเข้าใช้งานผ่านเบราว์เซอร์ได้ที่: `http://localhost:3000`*

---
### 💡 ทางเลือกเสริม: รันทั้งหมดผ่าน Docker พร้อมกัน (ไม่เอา PgAdmin)
หากไม่อยากมารันแยก `npm run dev` เองและต้องการให้รันทุกอย่าง (Postgres, Backend, Frontend) ใน Docker เลย ให้ใช้คำสั่งเดียวจบได้ดังนี้:
```bash
docker-compose -f docker-compose.prod.yml up -d postgres backend frontend
```
*(หมายเหตุ: หากเพิ่งรันเป็นครั้งแรก คุณอาจจะต้องเข้าไปจัดการ Database สกีมาด้วยคำสั่ง `cd backend` และรัน `npx prisma db push` ในเครื่องก่อน หรือใช้ Exec เข้าไปทำใน Container ก็ได้ขึ้นอยู่กับความสะดวก)*
