# แผนโครงการ: InfraPilot (IT Asset and Patch Intelligence Platform)

เอกสารนี้คือฉบับร่าง (Draft) สำหรับขอบเขตและแผนการพัฒนาโปรเจค InfraPilot เพื่อให้พร้อมใช้งานจริงระดับ Production โดยออกแบบมาเพื่อให้ทีม IT ขนาดเล็กใช้งานได้ง่าย แต่มีโครงสร้างทางเทคนิคที่มั่นคง ปลอดภัย และขยายผลได้ในอนาคต

---

## 1. ภาพรวมระบบ (System Overview)
**InfraPilot** เป็นระบบ Web Application รวมศูนย์สำหรับใช้จัดการสินทรัพย์ไอที (IT Asset Management), ติดตามสถานะของตารางการอัปเดต/Patch, ประเมินความเสี่ยงของโครงสร้างพื้นฐาน และมีระบบการจัดเก็บรหัสผ่าน (Credential Vault) ที่ปลอดภัย

## 2. บทบาทและการเข้าถึง (User Roles & Permissions)
เพื่อความปลอดภัยในระยะยาว ระบบควรมี Role พื้นฐาน 3 ระดับ:
1. **Admin:** จัดการผู้ใช้งาน (User Management), ตั้งค่าระบบ, จัดการ Asset และ Credentials ได้ทั้งหมด
2. **Editor:** เพิ่ม/แก้ไข ข้อมูล Asset ได้ และดู/ใช้งาน Credentials ได้ แต่ไม่มีสิทธิ์ลบข้อมูลสำคัญ
3. **Viewer:** เข้าดู Dashboard, ข้อมูล Asset, สถานะ Patch ได้แบบ Read-only (แต่เข้าถึง/ดูรหัสผ่านใน Credential Vault **ไม่ได้**)

---

## 3. รายละเอียดฟีเจอร์หลัก (Core Features Requirements)

### 3.1 IT Asset Inventory (ระบบจัดการสินทรัพย์ไอที)
*   **ประเภทที่รองรับ:** Physical Servers, Virtual Machines, Applications (Software), Databases และ Network Devices
*   **ข้อมูลที่จะเก็บ:** 
    *   **ระบบพื้นฐาน:** ชื่อ Asset, IP Address, MAC Address, OS/Version
    *   **การจัดการ:** เจ้าของ (Owner/Team), แผนก, สถานะ (Active/Inactive/Maintenance/Decommissioned)
    *   **การเงิน (Financials):** วันที่จัดซื้อ, วันที่เริ่มใช้งาน, ราคาซื้อ, ผู้ขาย (Vendor) และวันที่หมดประกัน (Warranty Expiration)
    *   **ความเชื่อมโยง (Dependencies):** ระบบนี้ไปพึ่งพาระบบไหนอยู่ (เช่น Web Server ตัวนี้ใช้ Database ตัวไหน)
*   **การเพิ่มข้อมูล (Phase 1):** เน้นการเพิ่มข้อมูลผ่านแบบฟอร์ม (Form UI) ที่ใช้งานง่าย และรองรับการ Import/Export ผ่านไฟลฺ์ CSV

### 3.1.5 License & Contract Management (ระบบจัดการลิขสิทธิ์และสัญญา - *ฟีเจอร์เสนอแนะ*)
*   **จัดการ Software License:** บันทึกจำนวน License ที่ซื้อมา vs จำนวนที่ใช้งานจริง เพื่อป้องกันการใช้งานเกิน (Compliance) หรือใช้ไม่คุ้ม
*   **แจ้งเตือนสัญญา:** แจ้งเตือนล่วงหน้าก่อนที่สัญญาเช่าใช้ซอฟต์แวร์ (Subscription) หรือสัญญาบำรุงรักษาอุปกรณ์ (MA) จะหมดอายุ

### 3.2 Credential Vault (ระบบจัดเก็บรหัสผ่านและคีย์)
*   **ความปลอดภัย:** รหัสผ่านจะถูกเข้ารหัสด้วย **AES-256-GCM** ในฝั่ง Backend (NestJS) ก่อนบันทึกลง Database (PostgreSQL) ทำให้แม้แต่คนเข้าถึง Database ได้ก็จะไม่เห็นรหัสผ่านจริง
*   **การเข้าถึง:** การกดดู (Reveal) หรือกดคัดลอก (Copy) รหัสผ่าน จะต้องกดปุ่มยืนยันผ่าน UI
*   **ระบบตรวจสอบ (Audit Log):** ระบบจะแอบบันทึกประวัติเสมอว่าใครเป็นคนเข้ามาดู/คัดลอกรหัสผ่านของ Asset ตัวไหน และเมื่อไหร่ เพื่อใช้สืบสวนหากเกิดปัญหา

### 3.3 Patch Tracking System (ระบบติดตามการแพตช์และอัปเดต)
*   **ข้อมูลการติดตาม:** บันทึกเวอร์ชันปัจจุบันของ Software/OS, วันที่อัปเดตล่าสุด, และวันที่หมดอายุการสนับสนุน (EOL - End of Life Date)
*   **ระบบแจ้งเตือน (UI Alerts):** ขึ้นสถานะแจ้งเตือนในระบบล่วงหน้า เช่น แจ้งเตือน 30, 60, 90 วันก่อนซอฟต์แวร์หมดระยะเวลาการสนับสนุน (EOL) หรือแจ้งเตือนเมื่อไม่ได้อัปเดตมานานเกิน 6 เดือน

### 3.4 Infrastructure Risk Scoring (แดชบอร์ดประเมินความเสี่ยง)
*   **การคำนวณคะแนน:** คำนวณความเสี่ยงของโครงสร้างพื้นฐานแบบง่าย (Low / Medium / High / Critical) จากปัจจัยหลัก:
    *   *Critical:* มี OS/Software ที่หมดระยะเวลา EOL แล้วกำลังถูกใช้งานอยู่ หรือ อุปกรณ์หมดอายุการรับประกันแบบไม่มี MA
    *   *High:* มี Server/Asset ที่ขาดการอัปเดต Patch เกิน 6 เดือน
    *   *Medium:* รหัสผ่านใน Credential Vault ไม่ได้ถูกเปลี่ยนมานานเกินกว่า 90 วัน
*   **Dashboard:** หน้าแรกของระบบ นำเสนอคะแนนภาพรวมของทั้งองค์กร เป็นกราฟและตัวเลขสถานะแบบชัดเจน (ออกแบบด้วย shadcn/ui)

### 3.5 Network Map / Topology (แผนผังเชื่อมโยงระบบ - *ฟีเจอร์เสนอแนะในอนาคต*)
*   **Visualizing Dependencies:** แสดงแผนภาพความเชื่อมโยงของ Asset ต่างๆ เพื่อให้เห็นภาพรวมว่าถ้าระบบ A ล่ม จะส่งผลกระทบต่อระบบ B, C แบไหนบ้าง (ช่วยร่นระยะเวลาในการทำ Root Cause Analysis และประเมินผลกระทบก่อนนำแพตช์ไปลง)

---

## 4. สถาปัตยกรรมทางเทคนิค (System Architecture)

*   **Repository Pattern:** ใช้แบบ **Monorepo** (แนะนำใช้ Nx หรือ Turborepo) เพื่อเก็บโค้ดทั้ง Frontend และ Backend ไว้ในที่เดียวกัน ทำให้จัดการง่าย แชร์ Type ระหว่าง Front/Back ได้
*   **Frontend:** Next.js (App Router), Tailwind CSS สำหรับ Styling, และ shadcn/ui สำหรับจัดการ UI Components ให้ออกมาดูทันสมัยสไตล์ SaaS
*   **Backend:** NestJS (Node.js framework) สร้างเป็น RESTful API
*   **Database:** PostgreSQL
*   **Database ORM:** แนะนำใช้ **Prisma ORM** ควบคู่กับ NestJS เนื่องจากใช้งานง่าย การทำ Migration ราบรื่น และทำงานเข้ากับ TypeScript ได้ 100%
*   **Authentication:** JWT (JSON Web Token) สำหรับจัดการ Session ของผู้ใช้งาน
*   **Deployment Strategy:** จัดเตรียมไฟล์ `docker-compose.yml` เพื่อให้สามารถนำโปรเจคไปรันบน Server เครื่องใดก็ได้ได้อย่างรวดเร็ว

---

## 5. แผนการพัฒนา (Development Roadmap / Phases)

**Phase 1: Foundation & IT Asset (โครงสร้างระบบและคลังสินทรัพย์)**
*   เซ็ตอัพโปรเจค Monorepo (Next.js + NestJS + PostgreSQL + Prisma)
*   สร้างระบบ Authentication (Login/Register) และระบบ Roles
*   สร้างหน้า Dashboard เปล่า และระบบ IT Asset Inventory (ตารางข้อมูล, ฟอร์มบันทึก, แก้ไข)

**Phase 2: Security, Credential Vault & Licenses (ความปลอดภัยและลิขสิทธิ์)**
*   สร้าง Service เข้ารหัส Encryption/Decryption ด้วย AES-256 ที่ Backend
*   สร้างหน้า UI ของ Credential Vault เชื่อมโยงกับ IT Asset แต่ละตัว
*   สร้างหน้าจัดการ Software Licenses และวันหมดอายุสัญญา
*   สร้างระบบ Audit Log เพื่อบันทึกพฤติกรรมการเรียกดูข้อมูล

**Phase 3: Patch Tracking & Risk Scoring (ระบบติดตามและประเมินผล)**
*   เพิ่มข้อมูล EOL Date และการจำแนก Software Versions เข้าสู่ระบบ
*   สร้างระบบแจ้งเตือน (Alerts) เมื่อใกล้หมดอายุประกัน EOL หรือ License ต่างๆ
*   เขียน Logic ที่ฝั่ง Backend ในการคำนวณหา Risk Score ให้กับ Asset แต่ละตัว
*   ประกอบร่างหน้า Dashboard สรุปความเสี่ยง (ใช้ Chart/กราฟแสดงผล)

**Phase 4: Polish & Deployment (ปรับแต่งให้เนียนและเตรียมขึ้นระบบจริง)**
*   ทำระบบ Import/Export ด้วย CSV
*   ปรับแต่ง UI/UX ให้ใช้งานผ่านมือถือ/แท็บเล็ตได้ระดับหนึ่ง (Responsive)
*   จัดเตรียมไฟล์ Docker Compose ลับสำหรับการ Deploy บน Production Environment
