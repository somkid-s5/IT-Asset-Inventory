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
        name: 'Server & Virtualization',
        icon: 'server',
        documents: [
          {
            title: 'VMware vCenter: Accessing Management Interface',
            content: `## Overview
This guide covers how to access the vCenter Server Management Interface (VAMI) for maintenance.

### Access Details
* **URL:** \`https://vcenter.local:5480\`
* **Port:** 5480
* **Protocol:** HTTPS

### Common Tasks
1. **Checking Health:** Navigate to the "Summary" tab to view CPU, memory, and database status.
2. **Backups:** Configure automatic backups under the "Backup" section to an external FTP/NFS share.
3. **Updates:** Check for patches in the "Update" tab.

> [!CAUTION]
> Always take a snapshot of the vCenter VM before performing any updates.`,
          },
          {
            title: 'Standard VM Provisioning Checklist',
            content: `## VM Setup Standards
All new Virtual Machines must adhere to the following baseline configuration.

### Hardware Allocation
| Environment | CPU | RAM | Disk |
| :--- | :--- | :--- | :--- |
| **Development** | 2 vCPU | 4GB | 40GB |
| **UAT** | 4 vCPU | 8GB | 100GB |
| **Production** | 8 vCPU+ | 16GB+ | 200GB+ |

### Naming Convention
\`[PROJECT]-[ENV]-[SERVICE]-[ID]\`
Example: \`SAP-PROD-APP-01\`

### OS Hardening
* Disable unused services.
* Enable local firewall (ufw/firewalld).
* Install CrowdStrike sensor.`,
          },
        ],
      },
      {
        name: 'Network & Security',
        icon: 'shield',
        documents: [
          {
            title: 'VPN Connection Guide for Remote Work',
            content: `# Global VPN Access
Follow these steps to connect to the internal network via Cisco AnyConnect.

### Configuration
1. Open **Cisco AnyConnect Secure Mobility Client**.
2. Enter server: \`vpn.company.com\`
3. Provide your AD credentials.
4. Approve the **Duo Push** on your mobile device.

### Troubleshooting
* **Error 401:** Password expired. Reset via AD Portal.
* **Timeout:** Check if port 443 is blocked by your local ISP.`,
          },
        ],
      },
      {
        name: 'Databases',
        icon: 'database',
        documents: [
          {
            title: 'Enterprise Backup & Recovery Procedure',
            content: `# Enterprise Backup & Recovery Procedure

This document outlines the standard operating procedure (SOP) for data protection across all production systems.

![Data Center Backup Architecture](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=2000&ixlib=rb-4.0.3)

## 1. Backup Schedule & Strategy
We follow the **3-2-1 Backup Rule**: 3 copies of data, 2 different media, 1 offsite.

| Level | Frequency | Retention | Target |
| :--- | :--- | :--- | :--- |
| **Incremental** | Every 4 Hours | 7 Days | Local NAS |
| **Daily Full** | Every Night (01:00) | 30 Days | S3 Object Store |
| **Monthly Archive**| 1st of Month | 1 Year | Cold Storage (Tape) |

## 2. Automated Backup Script (PostgreSQL)
Use the following script to manually trigger a production database dump.

\`\`\`bash
#!/bin/bash
# Production DB Backup Script
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/mnt/backup/db"
DB_NAME="infrapilot_prod"

echo "🚀 Starting backup for $DB_NAME..."

# Execute pg_dump
docker exec it-asset-db pg_dump -U admin $DB_NAME > $BACKUP_DIR/$DB_NAME_$TIMESTAMP.sql

if [ $? -eq 0 ]; then
  echo "✅ Backup successful: $DB_NAME_$TIMESTAMP.sql"
  # Sync to S3 (Example)
  aws s3 cp $BACKUP_DIR/$DB_NAME_$TIMESTAMP.sql s3://my-infra-backups/
else
  echo "❌ Backup FAILED!"
  exit 1
fi
\`\`\`

## 3. Recovery Steps
> [!IMPORTANT]
> Always verify the integrity of the backup file before attempting a restore on production.

1. **Stop services:** \`systemctl stop infrapilot-backend\`
2. **Clear existing data:** \`dropdb -U admin infrapilot_prod\`
3. **Restore:**
   \`\`\`bash
   psql -U admin infrapilot_prod < /path/to/backup_file.sql
   \`\`\`
4. **Start services:** \`systemctl start infrapilot-backend\`

---
*Last Reviewed: May 2026 by IT Infrastructure Team*`,
          },
        ],
      },
      { name: 'General Support', icon: 'help-circle' },
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
