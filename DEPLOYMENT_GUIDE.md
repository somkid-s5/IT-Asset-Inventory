# 📘 คู่มือการติดตั้งระบบ IT-Asset-Inventory (InfraPilot) สำหรับ Production
**สถานะ:** สำหรับใช้งานภายในทีม (Internal IP-Based)  
**เวอร์ชัน:** 1.0.0 (เมษายน 2569)

---

## 1. ข้อมูลภาพรวม (Overview)
ระบบถูกออกแบบมาให้รันบน **Docker** เพื่อความเสถียร โดยมี **Nginx** เป็น Gateway หลักในการรับคำขอผ่าน Port 80 (Standard HTTP) เพื่อให้ผู้ใช้เข้าถึงผ่าน IP ของเครื่อง Server ได้โดยตรงโดยไม่ต้องระบุ Port

### 🏗️ โครงสร้างระบบ (Architecture)
*   **Frontend:** Next.js (Port 3000 -> Nginx `/`)
*   **Backend:** NestJS (Port 3001 -> Nginx `/api`)
*   **Database:** PostgreSQL 15 (Port 5432)
*   **DB Management:** pgAdmin 4 (Port 5050)
*   **Reverse Proxy:** Nginx (Port 80)

---

## 2. สิ่งที่ต้องเตรียม (System Requirements)
*   **Operating System:** Ubuntu 22.04 LTS หรือสูงกว่า (แนะนำ)
*   **Hardware:** RAM ขั้นต่ำ 2GB / CPU 2 Cores / Disk 20GB+
*   **Network:** ต้องสามารถเชื่อมต่อภายในวง LAN เดียวกันได้ และทราบเลข IP ของเครื่อง (เช่น `192.168.1.50`)

---

## 3. ขั้นตอนการเตรียมเครื่อง (Server Preparation)

### 3.1 อัปเดตระบบและตั้งค่าความปลอดภัย
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git vim ufw fail2ban
```

### 3.2 ตั้งค่า Firewall (UFW)
อนุญาตเฉพาะการเชื่อมต่อที่จำเป็น:
```bash
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow 5050  # สำหรับ pgAdmin (ถ้าต้องการใช้)
sudo ufw enable
```

---

## 4. การติดตั้ง Docker และ Docker Compose

```bash
# ติดตั้ง Docker Engine
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# เพิ่มสิทธิ์ให้ User ปัจจุบัน (ไม่ต้องใช้ sudo ทุกครั้ง)
sudo usermod -aG docker $USER

# ติดตั้ง Docker Compose V2
sudo apt install docker-compose-v2 -y
```
*(หมายเหตุ: หลังจากรันคำสั่งกลุ่มนี้ ให้ Logout แล้ว Login ใหม่หนึ่งครั้ง)*

---

## 5. การตั้งค่าโปรเจกต์ (Project Configuration)

### 5.1 ดึง Source Code และตั้งค่า Environment
```bash
git clone <URL_REPO> it-inventory
cd it-inventory
cp .env.example .env
nano .env
```

### 5.2 การตั้งค่าตัวแปรสำคัญในไฟล์ `.env`
**สำคัญ: ห้ามข้ามขั้นตอนนี้เด็ดขาด**
*   `POSTGRES_PASSWORD`: กำหนดรหัสผ่านฐานข้อมูลใหม่
*   `JWT_SECRET`: (สุ่มข้อความยาวๆ สำหรับระบบ Login)
*   `CREDENTIAL_ENCRYPTION_KEY`: (ข้อความ 64 ตัวอักษร Hex สำหรับเข้ารหัสรหัสผ่าน)
*   `NEXT_PUBLIC_API_URL`: **ระบุ IP ของ Server** เช่น http://192.168.1.50/api

---

## 6. การ Deploy ระบบ (Deployment)

### 6.1 รันระบบผ่าน Docker Compose
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 6.2 การตั้งค่าโครงสร้างฐานข้อมูล (ครั้งแรก)
```bash
# สร้างตารางในฐานข้อมูล
docker exec -it infrapilot_backend npx prisma migrate deploy

# สร้างข้อมูลเริ่มต้น (User Admin และระบบพื้นฐาน)
docker exec -it infrapilot_backend npx prisma db seed
```

---

## 7. การตั้งค่า Nginx (Gateway Setup)
เพื่อให้ทีมเข้าใช้งานผ่าน `http://<SERVER_IP>` ได้ทันที

### 7.1 ติดตั้งและสร้าง Config
```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/it-inventory
```

วางค่านี้ลงไปในไฟล์:
```nginx
server {
    listen 80;
    server_name _; # รับคำขอจากทุก IP

    # Backend API Path
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend UI Path
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 7.2 เปิดใช้งาน Config
```bash
sudo ln -s /etc/nginx/sites-available/it-inventory /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default # ลบค่าพื้นฐานของ Nginx
sudo nginx -t
sudo systemctl restart nginx
```

---

## 8. การใช้งานและการบำรุงรักษา (Maintenance)

### 🔴 การเข้าใช้งานสำหรับทีม
*   **หน้าเว็บหลัก:** `http://<SERVER_IP>`
*   **จัดการฐานข้อมูล:** `http://<SERVER_IP>:5050` (Login ด้วยค่าใน `.env`)

### 🟢 การอัปเดตเวอร์ชันใหม่
เมื่อมีการปรับปรุงโค้ด:
```bash
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
docker exec -it infrapilot_backend npx prisma migrate deploy
```

### 🟡 การดู Error Logs
```bash
# ดู Backend logs
docker logs -f infrapilot_backend
# ดู Nginx logs
sudo tail -f /var/log/nginx/error.log
```

---

## 9. ข้อมูลบัญชีเริ่มต้น (Default Credentials)
*ดูข้อมูลนี้ได้จากไฟล์ `backend/prisma/seed.ts`*
*   **Email:** `admin@example.com` (หรือตามที่คุณระบุใน Seed)
*   **Password:** ตามที่ระบุในไฟล์ `seed.ts` หรือ `.env`
*   *คำแนะนำ: ให้เปลี่ยนรหัสผ่านทันทีหลัง Login ครั้งแรก*
