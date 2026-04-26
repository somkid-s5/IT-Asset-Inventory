# 🕵️‍♂️ Code Review & Production Readiness Report: AssetOps (IT-Asset-Inventory)

รายงานผลการตรวจสอบโค้ดและสถาปัตยกรรมของโปรเจค AssetOps ก่อนนำขึ้น Deploy บน Production จริง 
จากการตรวจสอบซอร์สโค้ดในฝั่ง Frontend (Next.js) และ Backend (NestJS + Prisma) พบประเด็นที่ต้องได้รับการแก้ไขตามลำดับความสำคัญดังนี้ครับ:

---

## 🚨 CRITICAL (ต้องแก้ก่อน Deploy - เสี่ยงต่อ Security Breach หรือ Crash)

### 1. ช่องโหว่ Open Registration Bypass (Auth)
**ปัญหา:** ใน `backend/src/auth/auth.controller.ts` มีตรรกะการตรวจสอบ `x-registration-key` ที่มีช่องโหว่
```typescript
const secret = process.env.REGISTRATION_SECRET;
if (userCount > 0 && secret && registrationKey !== secret) {
    throw new UnauthorizedException('...');
}
```
หากในไฟล์ `.env` บน Production ลืมตั้งค่า `REGISTRATION_SECRET` เงื่อนไขนี้จะเป็นเท็จ (False) เสมอ ทำให้ **บุคคลภายนอกทุกคนสามารถยิง API สมัครสมาชิกเข้าสู่ระบบได้** โดยไม่ต้องใช้ Key ใดๆ

**วิธีแก้ (Actionable):**
เปลี่ยนตรรกะให้เป็น "Fail-safe Closed" คือถ้าไม่มีการตั้งค่า Secret ให้ปฏิเสธการลงทะเบียนทั้งหมด (หลังจากการสร้าง Admin คนแรก)
```typescript
const secret = process.env.REGISTRATION_SECRET;
if (userCount > 0) {
    if (!secret || registrationKey !== secret) {
        throw new UnauthorizedException('Registration is restricted. Valid registration key required.');
    }
}
```

### 2. Hardcoded Fallback Encryption Key (Security)
**ปัญหา:** ใน `backend/src/credentials/credentials.service.ts` มีการใช้ Hardcoded String เป็น Fallback หากไม่มี Environment Variable
```typescript
private readonly secretKey = process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
```
ใน Production หากลืมใส่ ENV ตัวนี้ รหัสผ่านทั้งหมดจะถูกเข้ารหัสด้วย Key สาธารณะนี้ ซึ่งอันตรายมาก นอกจากนี้ `aes-256-gcm` บังคับให้ Key ต้องยาว 32 bytes หากตั้งค่าผิด Server จะ Crash ทันทีเมื่อมีการเข้ารหัส

**วิธีแก้ (Actionable):**
ลบ Fallback ออก และบังคับให้โยน Error หากไม่มี Key หรือ Key ความยาวไม่ถูกต้องตั้งแต่ตอนเปิด Server
```typescript
// ลบ Fallback string ออก
private readonly secretKey = process.env.CREDENTIAL_ENCRYPTION_KEY;

constructor(private prisma: PrismaService) {
    if (!this.secretKey || Buffer.from(this.secretKey, 'hex').length !== 32) {
        throw new Error('CRITICAL: CREDENTIAL_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)');
    }
}
```

---

## ⚠️ HIGH (ควรแก้ด่วน - ส่งผลต่อ Performance หรือ UX)

### 1. Missing Pagination ทำให้เกิด Out of Memory (N+1 Risk)
**ปัญหา:** ใน `AssetsService` (`findAll`), `DatabasesService` และ `VmService` มีการใช้ `prisma.asset.findMany()` พร้อมดึง Relation ซ้อนทับกันมากถึง 7 ตารางโดย **ไม่มีการจำกัดจำนวน (Pagination)** 
เมื่อข้อมูล Asset มีจำนวนหลักพันหรือหลักหมื่น การดึง API ครั้งเดียวอาจทำให้ Node.js เกิด Memory Leak หรือ Database คอขวดจนล่มได้

**วิธีแก้ (Actionable):**
1. เพิ่ม Query Parameter สำหรับ Pagination (`page`, `limit`) ใน Controller
2. นำไปประยุกต์ใช้ใน Prisma Query:
```typescript
async findAll(skip?: number, take?: number) {
    const assets = await this.prisma.asset.findMany({
        skip: skip || 0,
        take: take || 50, // กำหนด Limit เสมอ
        include: { /* ... */ },
        orderBy: { createdAt: 'desc' },
    });
    // ควรนับ count รวมเพื่อส่งกลับไปทำ pagination ฝั่ง UI ด้วย
}
```

### 2. Global Rate Limiting เข้มงวดเกินไปจนผู้ใช้ถูกแบน
**ปัญหา:** ใน `backend/src/app.module.ts` มีการตั้งค่า `ThrottlerModule` ให้จำกัดเพียง **15 requests ต่อ 1 นาที (60000ms)**
สำหรับการทำงานของ Next.js SPA/React แค่โหลดหน้า Dashboard หนึ่งหน้า ก็อาจจะมีการยิง API 5-10 requests (auth/me, assets, VMs, stats) พร้อมๆ กัน ทำให้ผู้ใช้ปกติจะติด Error `429 Too Many Requests` ได้ง่ายมาก

**วิธีแก้ (Actionable):**
ปรับเพิ่ม Limit สำหรับผู้ใช้ปกติ หรือแบ่ง Rate limit เฉพาะจุด
```typescript
ThrottlerModule.forRoot([{
    ttl: 60000,
    limit: 100, // ปรับให้สมเหตุสมผลกับ SPA Application เช่น 100 req / นาที
}]),
```

---

## 📋 MEDIUM (ควรปรับปรุง - Code Quality & Maintainability)

### 1. การ Query ดึง Encrypted Password ในหน้า List โดยไม่จำเป็น
**ปัญหา:** ใน `assets.service.ts` `findAll` จะทำการ `include: { credentials: true }` ซึ่งจะไปดึง Field `encryptedPassword` มาจาก Database ด้วย แม้จะถูก Filter ทิ้งก่อนส่งให้ Frontend แต่เป็นการสิ้นเปลือง I/O Database และมีความเสี่ยงหากโค้ด Filter หายไป

**วิธีแก้ (Actionable):**
จำกัด Select Field ตั้งแต่ฝั่ง Database:
```typescript
include: {
    credentials: {
        select: { id: true, username: true, type: true, lastChangedDate: true }
    }
}
```

### 2. Audit Logs หายาก และเป็น Hard Limit (1,000 Records)
**ปัญหา:** `audit-logs.service.ts` ใช้ `take: 1000` แบบ Hard Code นั่นหมายความว่าบันทึกที่เก่าเกินกว่า 1,000 รายการจะไม่สามารถดูผ่านระบบได้เลย

**วิธีแก้ (Actionable):**
ควรทำ Pagination เหมือนกับระบบ Assets และรับ Parameters `startDate`, `endDate` ในการค้นหา

### 3. Hardcoded Passwords ใน `docker-compose.prod.yml`
**ปัญหา:** มีการเขียน Default Password เช่น `ChangeMe#Postgres2026!` ฝังลงไปใน Compose File แม้จะเป็นการใช้เป็นค่า Fallback ก็ยังทำให้มีโอกาสที่เผลอหลุดไปใช้งานจริง

**วิธีแก้ (Actionable):**
บังคับให้ค่าเหล่านี้ต้องดึงจาก `.env` ทั้งหมด ไม่ต้องใส่ Fallback text ใน docker-compose file เพื่อความปลอดภัยที่สูงสุด

---

## 💡 NICE TO HAVE (Best Practices & Optimization)

### 1. Database Indexes ขาดหาย
ในไฟล์ `schema.prisma` ไม่มีการทำ Index สำหรับ Field ที่มีการค้นหาบ่อย
**คำแนะนำ:** ควรเพิ่ม `@@index` เพื่อเพิ่มความเร็วในการ Query
```prisma
model Asset {
  // ... fields ...
  @@index([status])
  @@index([type])
  @@index([environment])
}
```

### 2. สร้าง Endpoint /health สำหรับ Docker Check
**คำแนะนำ:** เพิ่ม `HealthController` ง่ายๆ เพื่อเอาไว้ให้ Docker Compose หรือ Load Balancer เช็คสถานะการทำงานของแอปพลิเคชัน (Liveness Probe)

---

## ✅ Deployment Checklist (สิ่งที่ต้องทำก่อนขึ้น Production)

1. [ ] สร้างไฟล์ `.env` จริงสำหรับ Production แยกต่างหาก
2. [ ] Generate `CREDENTIAL_ENCRYPTION_KEY` ด้วย `openssl rand -hex 32` ใหม่ และห้ามหลุดเด็ดขาด
3. [ ] Generate `JWT_SECRET` และ `REGISTRATION_SECRET` ใหม่
4. [ ] ตรวจสอบว่าแก้ไขช่องโหว่ Registration Bypass (Critical #1) แล้ว
5. [ ] ตรวจสอบว่าปรับแก้ Pagination เพื่อป้องกัน Database ล่ม (High #1)
6. [ ] ทดสอบเข้าหน้าเว็บรัวๆ เพื่อเทสต์ว่า Rate Limiter (High #2) ไม่ทำการ Block ผู้ใช้ปกติ
7. [ ] รันคำสั่ง Prisma Migration บน Database Production
