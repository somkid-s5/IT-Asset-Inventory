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
        name: 'Infrastructure',
        icon: 'cloud',
        documents: [
          {
            title: 'How to Resize Storage on Azure Managed Disks',
            content: `## How to Resize Storage on Azure Managed Disks
A complete guide to resizing virtual machine disks on Azure without causing downtime.

### 1. Prerequisites
* Verify that the VM is in a healthy state.
* Always take a snapshot or back up your data before proceeding.

### 2. Steps in the Azure Portal
1. Navigate to the VM's Resource Group.
2. Select **Disks** from the left-hand menu.
3. Click on the disk you wish to resize.
4. Go to **Size + Performance** and enter the desired size.
5. Click **Save** to apply changes.

### 3. Expanding the Volume at the OS Level
* **Windows:** Use Disk Management or the PowerShell command \`Resize-Partition\`.
* **Linux:** Use the command \`resize2fs\` or \`xfs_growfs\` depending on the filesystem type.`,
          },
          {
            title: 'Troubleshooting Network Latency in Branches',
            content: `## Troubleshooting Network Latency in Branches
Troubleshooting guide for branch IT staff to diagnose network latency using MTR and Traceroute.

### 1. Basic Ping Test
\`\`\`bash
ping -c 50 gateway.branch.local
\`\`\`

### 2. Using MTR (My Traceroute)
Identify packet loss and latency across the network path:
\`\`\`bash
mtr -c 100 -r destination.ip
\`\`\``,
          },
        ],
      },
      {
        name: 'Security',
        icon: 'admin_panel_settings',
        documents: [
          {
            title: 'Annual Backup Policy 2024',
            content: `## Annual Backup Policy 2024
Official policy defining backup frequency (RPO/RTO) for all infrastructure servers.

### 1. Backup Frequency
* **Production Database:** Backup every 4 hours (RPO = 4 hours).
* **Application Config & Server Image:** Backup daily at 01:00 AM.

### 2. Storage Targets
* **Local Storage:** Stored on the branch NAS for 7 days.
* **Cloud Storage:** Archived in Azure Blob or AWS S3 Cold Storage for 30 days.`,
          },
        ],
      },
      {
        name: 'User Guides',
        icon: 'library_books',
        documents: [
          {
            title: 'VPN Configuration for Onboarding (macOS & Windows 11)',
            content: `## VPN Configuration Guide (macOS & Windows 11)
Step-by-step instructions for installing GlobalProtect VPN and registering MFA via Microsoft Authenticator.

### 1. GlobalProtect VPN Client Installation
* **Windows 11:** Download the installer from the IT Portal and double-click the \`.msi\` file.
* **macOS:** Download the macOS version, install via the \`.pkg\` file, and allow System Extension in System Settings.

### 2. Multi-Factor Authentication (MFA) Registration
1. Open the **Microsoft Authenticator** app on your mobile device.
2. Add a **Work or School** account.
3. Scan the QR code displayed on your computer screen to pair your account.`,
          },
        ],
      },
      { name: 'Troubleshooting', icon: 'build' },
      { name: 'Compliance & Standards', icon: 'verified_user' },
      { name: 'Release Notes', icon: 'new_releases' },
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
