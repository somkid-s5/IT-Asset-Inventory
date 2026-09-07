import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, Prisma } from '@prisma/client';
import { sanitizeHtml } from '../utils/sanitize';

@Injectable()
export class KnowledgeBaseService {
  constructor(private prisma: PrismaService) {}

  // --- Category CRUD ---
  async createCategory(name: string, icon?: string, userId?: string) {
    const category = await this.prisma.knowledgeCategory.create({
      data: { name, icon },
    });

    if (userId) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.CREATE_KB_CATEGORY,
          targetId: category.id,
          details: JSON.stringify({ name: category.name }),
        },
      });
    }

    return category;
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

  async deleteCategory(id: string, userId?: string) {
    // Check if category has documents
    const count = await this.prisma.knowledgeDocument.count({
      where: { categoryId: id },
    });

    if (count > 0) {
      throw new Error(
        'Cannot delete category with existing documents. Move or delete documents first.',
      );
    }

    const deleted = await this.prisma.knowledgeCategory.delete({
      where: { id },
    });

    if (userId) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.DELETE_KB_CATEGORY,
          targetId: id,
          details: JSON.stringify({ name: deleted.name }),
        },
      });
    }

    return deleted;
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
    applicationIds?: string[];
    assetIds?: string[];
    vmIds?: string[];
    databaseIds?: string[];
  }) {
    const sanitizedContent = sanitizeHtml(data.content);
    const document = await this.prisma.knowledgeDocument.create({
      data: {
        title: data.title,
        categoryId: data.categoryId,
        authorId: data.authorId,
        content: sanitizedContent,
        applicationLinks: {
          create: (data.applicationIds ?? []).map((applicationId) => ({
            applicationId,
          })),
        },
        assetLinks: {
          create: (data.assetIds ?? []).map((assetId) => ({ assetId })),
        },
        vmLinks: {
          create: (data.vmIds ?? []).map((vmId) => ({ vmId })),
        },
        databaseLinks: {
          create: (data.databaseIds ?? []).map((databaseId) => ({
            databaseId,
          })),
        },
      },
      include: {
        category: true,
        author: { select: { displayName: true } },
        applicationLinks: {
          include: { application: { select: { id: true, name: true } } },
        },
        assetLinks: {
          include: {
            asset: { select: { id: true, name: true, assetId: true } },
          },
        },
        vmLinks: {
          include: {
            vm: { select: { id: true, systemName: true, primaryIp: true } },
          },
        },
        databaseLinks: {
          include: {
            database: { select: { id: true, name: true, engine: true } },
          },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: data.authorId,
        action: AuditAction.CREATE_KB_DOCUMENT,
        targetId: document.id,
        details: JSON.stringify({
          title: document.title,
          categoryId: document.categoryId,
        }),
      },
    });

    return document;
  }

  async findAllDocuments(categoryId?: string) {
    return this.prisma.knowledgeDocument.findMany({
      where: categoryId ? { categoryId } : undefined,
      include: {
        category: true,
        author: {
          select: { id: true, displayName: true, username: true },
        },
        applicationLinks: {
          include: { application: { select: { id: true, name: true } } },
        },
        assetLinks: {
          include: {
            asset: { select: { id: true, name: true, assetId: true } },
          },
        },
        vmLinks: {
          include: {
            vm: { select: { id: true, systemName: true, primaryIp: true } },
          },
        },
        databaseLinks: {
          include: {
            database: { select: { id: true, name: true, engine: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async searchDocuments(q: string, limit = 50) {
    const query = q.trim();
    if (!query) return [];

    return this.prisma.knowledgeDocument.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { category: { name: { contains: query, mode: 'insensitive' } } },
        ],
      },
      take: Math.min(Math.max(limit, 1), 100),
      select: {
        id: true,
        title: true,
        content: true,
        viewCount: true,
        createdAt: true,
        updatedAt: true,
        categoryId: true,
        category: { select: { id: true, name: true, icon: true } },
        authorId: true,
        author: { select: { displayName: true } },
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
        applicationLinks: {
          include: { application: { select: { id: true, name: true } } },
        },
        assetLinks: {
          include: {
            asset: { select: { id: true, name: true, assetId: true } },
          },
        },
        vmLinks: {
          include: {
            vm: { select: { id: true, systemName: true, primaryIp: true } },
          },
        },
        databaseLinks: {
          include: {
            database: { select: { id: true, name: true, engine: true } },
          },
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

  async findPublicDocument(id: string) {
    const doc = await this.prisma.knowledgeDocument.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        content: true,
        categoryId: true,
        category: { select: { id: true, name: true, icon: true } },
        author: { select: { displayName: true } },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!doc) throw new NotFoundException('Document not found');

    await this.prisma.knowledgeDocument.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return doc;
  }

  async updateDocument(
    id: string,
    data: Prisma.KnowledgeDocumentUpdateInput & {
      applicationIds?: string[];
      assetIds?: string[];
      vmIds?: string[];
      databaseIds?: string[];
    },
    userId?: string,
  ) {
    const { applicationIds, assetIds, vmIds, databaseIds, ...documentData } =
      data;
    const updateData = { ...documentData };
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

    const updated = await this.prisma.$transaction(async (tx) => {
      if (applicationIds || assetIds || vmIds || databaseIds) {
        await Promise.all([
          applicationIds
            ? tx.knowledgeDocumentApplication.deleteMany({
                where: { documentId: id },
              })
            : Promise.resolve(),
          assetIds
            ? tx.knowledgeDocumentAsset.deleteMany({
                where: { documentId: id },
              })
            : Promise.resolve(),
          vmIds
            ? tx.knowledgeDocumentVm.deleteMany({ where: { documentId: id } })
            : Promise.resolve(),
          databaseIds
            ? tx.knowledgeDocumentDatabase.deleteMany({
                where: { documentId: id },
              })
            : Promise.resolve(),
        ]);
      }

      return tx.knowledgeDocument.update({
        where: { id },
        data: {
          ...updateData,
          ...(applicationIds
            ? {
                applicationLinks: {
                  create: applicationIds.map((applicationId) => ({
                    applicationId,
                  })),
                },
              }
            : {}),
          ...(assetIds
            ? {
                assetLinks: {
                  create: assetIds.map((assetId) => ({ assetId })),
                },
              }
            : {}),
          ...(vmIds
            ? { vmLinks: { create: vmIds.map((vmId) => ({ vmId })) } }
            : {}),
          ...(databaseIds
            ? {
                databaseLinks: {
                  create: databaseIds.map((databaseId) => ({ databaseId })),
                },
              }
            : {}),
        },
        include: {
          category: true,
          author: { select: { id: true, displayName: true, username: true } },
          applicationLinks: {
            include: { application: { select: { id: true, name: true } } },
          },
          assetLinks: {
            include: {
              asset: { select: { id: true, name: true, assetId: true } },
            },
          },
          vmLinks: {
            include: {
              vm: { select: { id: true, systemName: true, primaryIp: true } },
            },
          },
          databaseLinks: {
            include: {
              database: { select: { id: true, name: true, engine: true } },
            },
          },
        },
      });
    });

    if (userId) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.UPDATE_KB_DOCUMENT,
          targetId: id,
          details: JSON.stringify({
            title: updated.title,
            categoryId: updated.categoryId,
          }),
        },
      });
    }

    return updated;
  }

  async removeDocument(id: string, userId?: string) {
    const deleted = await this.prisma.knowledgeDocument.delete({
      where: { id },
    });

    if (userId) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.DELETE_KB_DOCUMENT,
          targetId: id,
          details: JSON.stringify({ title: deleted.title }),
        },
      });
    }

    return deleted;
  }

  async recordImageUpload(filename: string, userId: string) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.UPLOAD_KB_IMAGE,
        details: JSON.stringify({ filename }),
      },
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
