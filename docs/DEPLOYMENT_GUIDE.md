# คู่มือ Deploy SysOps (Internal IP + HTTPS)

เอกสารนี้เป็นขั้นตอน deploy สำหรับทีม System Admin ภายในเครือข่ายเดียวกัน โดยใช้ Docker Compose ชุดเดียวกับที่อยู่ใน repository ปัจจุบัน ระบบไม่มี application-managed backup/restore; การปกป้อง VM และข้อมูลให้ใช้ NetBackup ของทีมตามกระบวนการเดิม

## สิ่งที่ต้องเตรียม

- Deployment VM ที่ติดตั้ง Docker Engine และ Docker Compose v2
- IP ภายในของ VM เช่น `192.168.1.50` และให้เครื่องลูกข่ายเข้าถึง TCP `80/443` ได้
- ไฟล์ `.env` ที่มีค่าจริง (ห้าม commit)
- ค่า secret แบบสุ่ม: `JWT_SECRET`, `BOOTSTRAP_SECRET`, `CREDENTIAL_ENCRYPTION_KEY` (64 ตัวอักษร hex) และรหัสผ่านเริ่มต้นที่แข็งแรง

PostgreSQL และ pgAdmin อยู่เฉพาะใน Docker network และไม่มีการ publish port ออก LAN

## ตั้งค่า `.env`

```bash
cp .env.example .env
nano .env
```

ค่าที่ต้องกำหนดอย่างน้อย:

```dotenv
POSTGRES_USER=infrapilot
POSTGRES_PASSWORD=<สุ่มค่าใหม่>
POSTGRES_DB=infrapilot_db
JWT_SECRET=<สุ่มค่าใหม่>
CREDENTIAL_ENCRYPTION_KEY=<64-character-hex>
BOOTSTRAP_SECRET=<สุ่มค่าใหม่>
DEFAULT_ADMIN_PASSWORD=<รหัสผ่าน Admin ชั่วคราว>
DEFAULT_EDITOR_PASSWORD=<รหัสผ่าน Editor สำหรับ dev seed เท่านั้น>
DEFAULT_VIEWER_PASSWORD=<รหัสผ่าน Viewer สำหรับ dev seed เท่านั้น>
APP_HOST=192.168.1.50
FRONTEND_URL=https://192.168.1.50
COOKIE_SECURE=true
NEXT_PUBLIC_API_URL=/api
```

`APP_HOST` ต้องเป็น IP หรือ DNS name ที่ทีมใช้เปิดเว็บจริง หากใช้ IP ให้เปิด `https://<APP_HOST>` เท่านั้น

## Start / update stack

จากโฟลเดอร์ repository:

```bash
docker compose --env-file .env up -d --build
docker compose --env-file .env ps
```

Backend จะรัน `prisma migrate deploy` ก่อน start โดยอัตโนมัติ ตรวจ health ได้ดังนี้:

```bash
curl -k https://192.168.1.50/api/health/live
curl -k https://192.168.1.50/api/health/ready
```

`live` ยืนยันว่า process ทำงาน ส่วน `ready` ยืนยันว่าเชื่อมต่อ PostgreSQL ได้

## Bootstrap ผู้ดูแลระบบครั้งแรก

สร้าง Administrator เพียงครั้งเดียวผ่านหน้า Login หรือ API โดยส่ง `BOOTSTRAP_SECRET` ใน header `x-bootstrap-key` ไปยัง `POST /api/auth/bootstrap` จากนั้นให้เปลี่ยนรหัสผ่านตามนโยบายทีมและสร้างบัญชีผู้ใช้เพิ่มจากหน้า Admin Users การสมัครเองภายหลังจะถูกปิด

ห้ามนำค่า secret หรือรหัสผ่านจริงใส่ในเอกสาร, log, issue หรือ commit

## การยอมรับ certificate และการเข้าใช้งาน

Caddy ใน stack ออก internal certificate ให้ `APP_HOST` และ redirect HTTP ไป HTTPS อัตโนมัติ เปิด `https://<internal-ip>` จากเครื่องใน LAN แล้วเลือกยอมรับ/ติดตั้ง certificate ตามนโยบายเครื่องลูกข่ายครั้งแรก หลังจากนั้นใช้ลิงก์ HTTPS เดิมแชร์ให้ทีมได้

ตรวจว่า HTTP redirect สำเร็จ:

```bash
curl -I http://192.168.1.50
```

ควรได้สถานะ `301` หรือ `308` ไปยัง `https://192.168.1.50/`

## Restart และหยุดระบบ

การ restart ปกติไม่ลบข้อมูล เพราะ PostgreSQL ใช้ named volume:

```bash
docker compose --env-file .env restart
docker compose --env-file .env down
docker compose --env-file .env up -d
```

ห้ามใช้ `docker compose down -v` ใน deployment จริง เพราะจะลบ volume ฐานข้อมูล

## ตรวจสอบหลัง deploy

1. `docker compose ps` แสดง `postgres`, `backend`, `frontend`, `gateway` เป็น running/healthy ตามลำดับ
2. เปิด HTTPS ด้วย IP แล้ว login ได้
3. ตรวจสร้าง/แก้ไข/Archive รายการ Asset, VM, Database และ Document
4. ตรวจ Global Search, Data Quality และ Export workbook
5. restart stack แล้วตรวจว่าผู้ใช้และข้อมูลเดิมยังอยู่

ดู log เฉพาะ service ที่เกี่ยวข้องได้ด้วย:

```bash
docker compose logs --tail=200 backend
docker compose logs --tail=200 gateway
```

สำหรับชุดตรวจพัฒนาและ E2E ให้ดูคำสั่งใน [README.md](../README.md) และใช้ `docker compose` ใน environment ที่ Docker daemon พร้อมใช้งาน
