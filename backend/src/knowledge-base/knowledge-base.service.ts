import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { sanitizeHtml } from '../utils/sanitize';

@Injectable()
export class KnowledgeBaseService {
  constructor(private prisma: PrismaService) {}

  // --- Category CRUD ---
  async createCategory(name: string, icon?: string) {
    return this.prisma.knowledgeCategory.create({
      data: { name, icon },
    });
  }

  async initializeDefaults(authorId: string) {
    const defaults = [
      {
        name: 'Infrastructure (โครงสร้างพื้นฐาน)',
        icon: 'cloud',
        documents: [
          {
            title: 'ขั้นตอนการขยายขนาด Storage บน Azure Managed Disks',
            content: `## ขั้นตอนการขยายขนาด Storage บน Azure Managed Disks
คู่มือฉบับสมบูรณ์สำหรับการปรับขนาด Disk ของ Virtual Machine บนระบบ Azure โดยไม่ทำให้เกิด Downtime

### 1. การเตรียมความพร้อมก่อนดำเนินการ
* ตรวจสอบว่า VM อยู่ในสถานะที่เหมาะสม
* ทำการ Snapshot ข้อมูลหรือสำรองข้อมูลก่อนเริ่มดำเนินการเสมอ

### 2. ขั้นตอนการขยายขนาดใน Azure Portal
1. เข้าไปที่ Resource Group ของ VM
2. เลือก Disks จากเมนูด้านซ้าย
3. คลิกเลือก disk ที่ต้องการปรับขนาด
4. ไปที่ Size + Performance แล้วใส่ขนาดใหม่ที่ต้องการ
5. กด Save เพื่อบันทึกการเปลี่ยนแปลง

### 3. การขยาย Volume ในระดับ OS
* สำหรับ Windows: ใช้ Disk Management หรือคำสั่ง PowerShell \`Resize-Partition\`
* สำหรับ Linux: ใช้คำสั่ง \`resize2fs\` หรือ \`xfs_growfs\` ตามประเภทของ Filesystem`,
          },
          {
            title: 'วิธีการตรวจสอบสาเหตุ Network Latency ภายในสาขา',
            content: `## วิธีการตรวจสอบสาเหตุ Network Latency ภายในสาขา
Troubleshooting guide สำหรับฝ่าย IT ประจำสาขา ในการใช้คำสั่ง mtr และ traceroute เพื่อวิเคราะห์จุดที่มีปัญหาใน MPLS Tunnel

### 1. การทดสอบด้วยคำสั่ง ping
\`\`\`bash
ping -c 50 gateway.branch.local
\`\`\`

### 2. การใช้เครื่องมือ MTR (My Traceroute)
เพื่อดูความล่าช้า (latency) และอัตราการสูญเสียของแพ็กเกจ (packet loss) ตลอดเส้นทาง:
\`\`\`bash
mtr -c 100 -r destination.ip
\`\`\``,
          }
        ]
      },
      {
        name: 'Security (ความปลอดภัย)',
        icon: 'admin_panel_settings',
        documents: [
          {
            title: 'นโยบายการสำรองข้อมูล (Backup Policy) ประจำปี 2024',
            content: `## นโยบายการสำรองข้อมูล (Backup Policy) ประจำปี 2024
เอกสารทางการกำหนดความถี่ในการทำ Backup (RPO/RTO) สำหรับเซิร์ฟเวอร์ทุกตัวในระบบ Infrastructure ขององค์กร

### 1. ความถี่ในการสำรองข้อมูล (Backup Frequency)
* **Production Database:** สำรองข้อมูลทุกๆ 4 ชั่วโมง (RPO = 4 ชั่วโมง)
* **Application Config & Server Image:** สำรองข้อมูลทุกวันเวลา 01:00 น.

### 2. สถานที่จัดเก็บข้อมูลสำรอง (Storage Targets)
* **Local Storage:** จัดเก็บไว้ที่ NAS ภายในสาขาเป็นเวลา 7 วัน
* **Cloud Storage:** จัดเก็บไว้ที่ Azure Blob/AWS S3 Cold Storage เป็นเวลา 30 วัน`,
          }
        ]
      },
      {
        name: 'User Guides (คู่มือการใช้งาน)',
        icon: 'library_books',
        documents: [
          {
            title: 'การตั้งค่า VPN สำหรับพนักงานใหม่ (macOS & Windows 11)',
            content: `## การตั้งค่า VPN สำหรับพนักงานใหม่ (macOS & Windows 11)
รายละเอียดขั้นตอนการติดตั้ง GlobalProtect VPN และการลงทะเบียน MFA ผ่านแอปพลิเคชัน Microsoft Authenticator

### 1. การติดตั้ง GlobalProtect VPN Client
* **Windows 11:** ดาวน์โหลดตัวติดตั้งจาก IT Portal แล้วดับเบิลคลิกไฟล์ \`.msi\` เพื่อเริ่มติดตั้ง
* **macOS:** ดาวน์โหลดเวอร์ชัน macOS ติดตั้งผ่านไฟล์ \`.pkg\` และให้สิทธิ์ System Extension ใน System Settings

### 2. การลงทะเบียน Multi-Factor Authentication (MFA)
1. เปิดแอป **Microsoft Authenticator** บนสมาร์ทโฟน
2. เลือกเพิ่มบัญชี Work or School
3. สแกน QR Code ที่แสดงบนหน้าจอคอมพิวเตอร์ของคุณเพื่อจับคู่บัญชี`,
          }
        ]
      },
      { name: 'Troubleshooting (การแก้ปัญหา)', icon: 'build' },
      { name: 'Compliance & Standards', icon: 'verified_user' },
      { name: 'Release Notes (อัปเดตระบบ)', icon: 'new_releases' },
    ];

    for (const item of defaults) {
      const category = await this.prisma.knowledgeCategory.upsert({
        where: { name: item.name },
        update: {},
        create: { name: item.name, icon: item.icon },
      });

      // Create sample documents if provided
      if (item.documents) {
        for (const doc of item.documents) {
          const exists = await this.prisma.knowledgeDocument.findFirst({
            where: { title: doc.title, categoryId: category.id },
          });
          if (!exists) {
            await this.prisma.knowledgeDocument.create({
              data: {
                ...doc,
                categoryId: category.id,
                authorId: authorId,
              },
            });
          }
        }
      }
    }
    return { success: true };
  }

  async deleteCategory(id: string) {
    // Check if category has documents
    const count = await this.prisma.knowledgeDocument.count({
      where: { categoryId: id },
    });

    if (count > 0) {
      throw new Error(
        'Cannot delete category with existing documents. Move or delete documents first.',
      );
    }

    return this.prisma.knowledgeCategory.delete({
      where: { id },
    });
  }

  async findAllCategories() {
    return this.prisma.knowledgeCategory.findMany({
      include: {
        _count: {
          select: { documents: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findCategory(id: string) {
    const category = await this.prisma.knowledgeCategory.findUnique({
      where: { id },
      include: {
        documents: {
          include: {
            category: true,
            author: { select: { displayName: true, avatarSeed: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { documents: true },
        },
      },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  // --- Document CRUD ---
  async createDocument(data: {
    title: string;
    content: string;
    categoryId: string;
    authorId: string;
  }) {
    const sanitizedContent = sanitizeHtml(data.content);
    return this.prisma.knowledgeDocument.create({
      data: {
        ...data,
        content: sanitizedContent,
      },
      include: {
        category: true,
        author: { select: { displayName: true } },
      },
    });
  }

  async findAllDocuments(categoryId?: string) {
    return this.prisma.knowledgeDocument.findMany({
      where: categoryId ? { categoryId } : undefined,
      include: {
        category: true,
        author: {
          select: { id: true, displayName: true, username: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findDocument(id: string) {
    const doc = await this.prisma.knowledgeDocument.findUnique({
      where: { id },
      include: {
        category: true,
        author: {
          select: { id: true, displayName: true, username: true },
        },
      },
    });

    if (!doc) throw new NotFoundException('Document not found');

    // Increment view count (optional but good practice)
    await this.prisma.knowledgeDocument.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return doc;
  }

  async updateDocument(id: string, data: Prisma.KnowledgeDocumentUpdateInput) {
    const updateData = { ...data };
    if (typeof updateData.content === 'string') {
      updateData.content = sanitizeHtml(updateData.content);
    } else if (
      updateData.content &&
      typeof updateData.content === 'object' &&
      'set' in updateData.content
    ) {
      const setVal = updateData.content.set;
      if (typeof setVal === 'string') {
        updateData.content = { set: sanitizeHtml(setVal) };
      }
    }

    return this.prisma.knowledgeDocument.update({
      where: { id },
      data: updateData,
    });
  }

  async removeDocument(id: string) {
    return this.prisma.knowledgeDocument.delete({
      where: { id },
    });
  }

  async getRecentDocuments(limit: number = 5) {
    return this.prisma.knowledgeDocument.findMany({
      take: limit,
      include: {
        category: true,
        author: { select: { displayName: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
