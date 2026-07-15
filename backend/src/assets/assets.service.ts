import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { ImportAssetRowDto } from './dto/bulk-import-assets.dto';
import { BulkUpdateAssetsDto } from './dto/bulk-update-assets.dto';
import { AssetStatus, AssetType, AuditAction, Prisma } from '@prisma/client';
import { CredentialsService } from '../credentials/credentials.service';

type AssetWithRelations = Prisma.AssetGetPayload<{
  include: {
    patchInfo: true;
    ipAllocations: true;
    parent: true;
    children: true;
    credentials: true;
    notes: {
      include: {
        createdByUser: {
          select: { id: true; displayName: true; avatarSeed: true };
        };
      };
    };
    attachments: {
      include: {
        createdByUser: {
          select: { id: true; displayName: true; avatarSeed: true };
        };
      };
    };
  };
}>;

@Injectable()
export class AssetsService {
  constructor(
    private prisma: PrismaService,
    private credentialsService: CredentialsService,
  ) {}

  private buildCreateRelations(dto: CreateAssetDto | UpdateAssetDto) {
    return {
      ...(dto.ips !== undefined
        ? {
            ipAllocations: {
              create: (dto.ips ?? []).map((ip) => ({
                address: ip.address.trim(),
                type: ip.type?.trim() || null,
                nodeLabel: ip.nodeLabel?.trim() || null,
                manageType: ip.manageType?.trim() || null,
                version: ip.version?.trim() || null,
              })),
            },
          }
        : {}),
      ...(dto.credentials !== undefined
        ? {
            credentials: {
              create: (dto.credentials ?? [])
                .filter((credential) => credential.username.trim())
                .map((credential) => ({
                  username: credential.username.trim(),
                  type: credential.type?.trim() || null,
                  nodeLabel: credential.nodeLabel?.trim() || null,
                  manageType: credential.manageType?.trim() || null,
                  version: credential.version?.trim() || null,
                  encryptedPassword: this.credentialsService.encrypt(
                    credential.password ?? '',
                  ),
                })),
            },
          }
        : {}),
    };
  }

  private buildReplaceRelations(dto: CreateAssetDto | UpdateAssetDto) {
    return {
      ...(dto.ips !== undefined
        ? {
            ipAllocations: {
              deleteMany: {},
              create: (dto.ips ?? []).map((ip) => ({
                address: ip.address.trim(),
                type: ip.type?.trim() || null,
                nodeLabel: ip.nodeLabel?.trim() || null,
                manageType: ip.manageType?.trim() || null,
                version: ip.version?.trim() || null,
              })),
            },
          }
        : {}),
      ...(dto.credentials !== undefined
        ? {
            credentials: {
              deleteMany: {},
              create: (dto.credentials ?? [])
                .filter((credential) => credential.username.trim())
                .map((credential) => ({
                  username: credential.username.trim(),
                  type: credential.type?.trim() || null,
                  nodeLabel: credential.nodeLabel?.trim() || null,
                  manageType: credential.manageType?.trim() || null,
                  version: credential.version?.trim() || null,
                  encryptedPassword: this.credentialsService.encrypt(
                    credential.password ?? '',
                  ),
                })),
            },
          }
        : {}),
    };
  }

  private toListItem(asset: AssetWithRelations) {
    return {
      ...asset,
      credentials: asset.credentials.map((credential) => ({
        id: credential.id,
        username: credential.username,
        type: credential.type,
        lastChangedDate: credential.lastChangedDate,
      })),
    };
  }

  private toDetail(asset: AssetWithRelations) {
    return {
      ...asset,
      credentials: asset.credentials.map((credential) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { encryptedPassword, ...rest } = credential;
        return rest;
      }),
    };
  }

  async create(createAssetDto: CreateAssetDto, userId: string) {
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ips: _ips,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      credentials: _credentials,
      ...assetData
    } = createAssetDto;

    const created = await this.prisma.asset.create({
      data: {
        ...assetData,
        parentId: assetData.parentId === '' ? null : assetData.parentId,
        status: createAssetDto.status || AssetStatus.ACTIVE,
        createdByUserId: userId,
        ...this.buildCreateRelations(createAssetDto),
      },
      include: {
        patchInfo: true,
        ipAllocations: true,
        parent: true,
        children: true,
        credentials: true,
        notes: {
          include: {
            createdByUser: {
              select: { id: true, displayName: true, avatarSeed: true },
            },
          },
          orderBy: [
            { isPinned: 'desc' as const },
            { createdAt: 'desc' as const },
          ],
        },
        attachments: {
          include: {
            createdByUser: {
              select: { id: true, displayName: true, avatarSeed: true },
            },
          },
          orderBy: { createdAt: 'desc' as const },
        },
      },
    });

    const typedCreated = created as unknown as AssetWithRelations;

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.CREATE_ASSET,
        targetId: typedCreated.id,
        details: JSON.stringify({
          name: typedCreated.name,
          type: typedCreated.type,
          assetId: typedCreated.assetId,
        }),
      },
    });

    return this.toDetail(typedCreated);
  }

  async findAll(
    page = 1,
    limit = 100,
    filters: {
      q?: string;
      type?: string;
      status?: string;
      environment?: string;
      owner?: string;
      location?: string;
    } = {},
  ) {
    const skip = (page - 1) * limit;
    const take = Math.min(limit, 200); // limit to max 200 per page
    const q = filters.q?.trim();
    const where: Prisma.AssetWhereInput = {
      ...(filters.type ? { type: filters.type as AssetType } : {}),
      ...(filters.status ? { status: filters.status as AssetStatus } : {}),
      ...(filters.environment ? { environment: filters.environment } : {}),
      ...(filters.owner
        ? { owner: { equals: filters.owner, mode: 'insensitive' } }
        : {}),
      ...(filters.location
        ? { location: { equals: filters.location, mode: 'insensitive' } }
        : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { assetId: { contains: q, mode: 'insensitive' } },
              { sn: { contains: q, mode: 'insensitive' } },
              { owner: { contains: q, mode: 'insensitive' } },
              {
                ipAllocations: {
                  some: { address: { contains: q, mode: 'insensitive' } },
                },
              },
            ],
          }
        : {}),
    };

    const [assets, total] = await Promise.all([
      this.prisma.asset.findMany({
        skip,
        take,
        where,
        include: {
          patchInfo: true,
          ipAllocations: true,
          parent: true,
          children: true,
          credentials: {
            select: {
              id: true,
              username: true,
              type: true,
              lastChangedDate: true,
            },
          },
          notes: {
            include: {
              createdByUser: {
                select: { id: true, displayName: true, avatarSeed: true },
              },
            },
            orderBy: [
              { isPinned: 'desc' as const },
              { createdAt: 'desc' as const },
            ],
          },
          attachments: {
            include: {
              createdByUser: {
                select: { id: true, displayName: true, avatarSeed: true },
              },
            },
            orderBy: { createdAt: 'desc' as const },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.asset.count({ where }),
    ]);

    return {
      data: assets.map((asset) =>
        this.toListItem(asset as unknown as AssetWithRelations),
      ),
      total,
      page,
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async getDataQualitySummary() {
    const assets = await this.prisma.asset.findMany({
      select: {
        id: true,
        assetId: true,
        name: true,
        type: true,
        owner: true,
        location: true,
        sn: true,
        warrantyExpiration: true,
        ipAllocations: { select: { id: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const today = new Date();
    const issues = assets.flatMap((asset) => {
      const missing = [
        !asset.owner && 'owner',
        !asset.location && 'location',
        !asset.sn && 'serial number',
        asset.ipAllocations.length === 0 && 'IP address',
      ].filter(Boolean) as string[];
      if (asset.warrantyExpiration && asset.warrantyExpiration < today) {
        missing.push('expired warranty');
      }
      return missing.length
        ? [
            {
              id: asset.id,
              assetId: asset.assetId,
              name: asset.name,
              type: asset.type,
              issues: missing,
            },
          ]
        : [];
    });
    return {
      totalAssets: assets.length,
      completeAssets: assets.length - issues.length,
      issues,
      issueCount: issues.length,
    };
  }

  async bulkImport(rows: ImportAssetRowDto[], userId: string) {
    const seenAssetIds = new Set<string>();
    const errors: Array<{ row: number; message: string }> = [];
    rows.forEach((row, index) => {
      const assetId = row.assetId?.trim();
      if (assetId && (seenAssetIds.has(assetId) || !assetId)) {
        errors.push({
          row: index + 2,
          message: `Duplicate Asset ID: ${assetId}`,
        });
      }
      if (assetId) seenAssetIds.add(assetId);
    });
    if (errors.length) return { created: 0, errors };

    const existing = await this.prisma.asset.findMany({
      where: { assetId: { in: [...seenAssetIds] } },
      select: { assetId: true },
    });
    if (existing.length) {
      return {
        created: 0,
        errors: existing.map((asset) => ({
          row: 0,
          message: `Asset ID already exists: ${asset.assetId}`,
        })),
      };
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const records = await Promise.all(
        rows.map((row) =>
          tx.asset.create({
            data: {
              name: row.name.trim(),
              type: row.type,
              assetId: row.assetId?.trim() || null,
              status: row.status ?? AssetStatus.ACTIVE,
              environment: row.environment?.trim() || null,
              owner: row.owner?.trim() || null,
              department: row.department?.trim() || null,
              location: row.location?.trim() || null,
              rack: row.rack?.trim() || null,
              brandModel: row.brandModel?.trim() || null,
              sn: row.sn?.trim() || null,
              createdByUserId: userId,
            },
          }),
        ),
      );
      await tx.auditLog.create({
        data: {
          userId,
          action: AuditAction.CREATE_ASSET,
          details: JSON.stringify({
            source: 'csv-import',
            count: records.length,
          }),
        },
      });
      return records;
    });
    return { created: created.length, errors: [] };
  }

  async bulkUpdate(dto: BulkUpdateAssetsDto, userId: string) {
    if (dto.status === undefined && dto.owner === undefined) {
      throw new NotFoundException('Choose an owner or status to update.');
    }
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.asset.updateMany({
        where: { id: { in: dto.ids } },
        data: {
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.owner !== undefined
            ? { owner: dto.owner.trim() || null }
            : {}),
        },
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: AuditAction.UPDATE_ASSET,
          details: JSON.stringify({
            source: 'bulk-update',
            count: updated.count,
            status: dto.status,
            owner: dto.owner,
          }),
        },
      });
      return updated;
    });
    return { updated: result.count };
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        patchInfo: true,
        ipAllocations: true,
        parent: true,
        children: true,
        credentials: true,
        notes: {
          include: {
            createdByUser: {
              select: { id: true, displayName: true, avatarSeed: true },
            },
          },
          orderBy: [
            { isPinned: 'desc' as const },
            { createdAt: 'desc' as const },
          ],
        },
        attachments: {
          include: {
            createdByUser: {
              select: { id: true, displayName: true, avatarSeed: true },
            },
          },
          orderBy: { createdAt: 'desc' as const },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    return this.toDetail(asset);
  }

  async getAuditLogs(assetId: string) {
    return this.prisma.auditLog.findMany({
      where: { targetId: assetId },
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            username: true,
            displayName: true,
            avatarSeed: true,
          },
        },
      },
    });
  }

  async update(id: string, updateAssetDto: UpdateAssetDto, userId: string) {
    await this.findOne(id);

    const { ips, credentials, ...assetData } = updateAssetDto;

    const updated = await this.prisma.$transaction(async (tx) => {
      return tx.asset.update({
        where: { id },
        data: {
          ...assetData,
          parentId: assetData.parentId === '' ? null : assetData.parentId,
          ...(updateAssetDto.customMetadata !== undefined
            ? {
                customMetadata:
                  updateAssetDto.customMetadata as Prisma.InputJsonValue,
              }
            : {}),
          ...(ips !== undefined || credentials !== undefined
            ? this.buildReplaceRelations({
                ...updateAssetDto,
                ips: updateAssetDto.ips ?? [],
                credentials: updateAssetDto.credentials ?? [],
              })
            : {}),
        },
        include: {
          patchInfo: true,
          ipAllocations: true,
          parent: true,
          children: true,
          credentials: true,
          notes: {
            include: {
              createdByUser: {
                select: { id: true, displayName: true, avatarSeed: true },
              },
            },
            orderBy: [
              { isPinned: 'desc' as const },
              { createdAt: 'desc' as const },
            ],
          },
          attachments: {
            include: {
              createdByUser: {
                select: { id: true, displayName: true, avatarSeed: true },
              },
            },
            orderBy: { createdAt: 'desc' as const },
          },
        },
      });
    });

    const typedUpdated = updated as unknown as AssetWithRelations;

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.UPDATE_ASSET,
        targetId: typedUpdated.id,
        details: JSON.stringify({
          name: typedUpdated.name,
          type: typedUpdated.type,
          assetId: typedUpdated.assetId,
        }),
      },
    });

    return this.toDetail(typedUpdated);
  }
  async remove(id: string, userId: string) {
    const asset = await this.findOne(id);

    const deleted = await this.prisma.asset.delete({
      where: { id },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.DELETE_ASSET,
        targetId: id,
        details: JSON.stringify({
          name: asset.name,
          type: asset.type,
        }),
      },
    });

    return deleted;
  }
}
