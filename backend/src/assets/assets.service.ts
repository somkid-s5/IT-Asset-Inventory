import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetStatus, AuditAction, Prisma } from '@prisma/client';
import { CredentialsService } from '../credentials/credentials.service';

type AssetWithRelations = Prisma.AssetGetPayload<{
    include: {
        patchInfo: true;
        ipAllocations: true;
        parent: true;
        children: true;
        credentials: true;
        notes: { include: { createdByUser: { select: { id: true, displayName: true, avatarSeed: true } } } };
        attachments: { include: { createdByUser: { select: { id: true, displayName: true, avatarSeed: true } } } };
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
                                  encryptedPassword: this.credentialsService.encrypt(credential.password ?? ''),
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
                                  encryptedPassword: this.credentialsService.encrypt(credential.password ?? ''),
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
            credentials: asset.credentials.map((credential) => ({
                ...credential,
                password: this.credentialsService.decrypt(credential.encryptedPassword),
            })),
        };
    }

    async create(createAssetDto: CreateAssetDto, userId: string) {
        const { ips: _ips, credentials: _credentials, ...assetData } = createAssetDto;

        const created = await this.prisma.asset.create({
            data: {
                ...assetData,
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
                notes: { include: { createdByUser: { select: { id: true, displayName: true, avatarSeed: true } } }, orderBy: [{ isPinned: 'desc' as const }, { createdAt: 'desc' as const }] },
                attachments: { include: { createdByUser: { select: { id: true, displayName: true, avatarSeed: true } } }, orderBy: { createdAt: 'desc' as const } },
            },
        });

        await this.prisma.auditLog.create({
            data: {
                userId,
                action: AuditAction.CREATE_ASSET,
                targetId: created.id,
                details: JSON.stringify({
                    name: created.name,
                    type: created.type,
                    assetId: created.assetId,
                }),
            },
        });

        return this.toDetail(created);
    }

    async findAll() {
        const assets = await this.prisma.asset.findMany({ take: 1000,
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
                    }
                },
                notes: { include: { createdByUser: { select: { id: true, displayName: true, avatarSeed: true } } }, orderBy: [{ isPinned: 'desc' as const }, { createdAt: 'desc' as const }] },
                attachments: { include: { createdByUser: { select: { id: true, displayName: true, avatarSeed: true } } }, orderBy: { createdAt: 'desc' as const } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return assets.map((asset) => this.toListItem(asset as any));
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
                notes: { include: { createdByUser: { select: { id: true, displayName: true, avatarSeed: true } } }, orderBy: [{ isPinned: 'desc' as const }, { createdAt: 'desc' as const }] },
                attachments: { include: { createdByUser: { select: { id: true, displayName: true, avatarSeed: true } } }, orderBy: { createdAt: 'desc' as const } },
            },
        });

        if (!asset) {
            throw new NotFoundException(`Asset with ID ${id} not found`);
        }

        return this.toDetail(asset);
    }

    async update(id: string, updateAssetDto: UpdateAssetDto, userId: string) {
        await this.findOne(id);

        const { ips, credentials, ...assetData } = updateAssetDto;

        const updated = await this.prisma.$transaction(async (tx) => {
            return tx.asset.update({
                where: { id },
                data: {
                    ...assetData,
                    ...(updateAssetDto.customMetadata !== undefined
                        ? { customMetadata: updateAssetDto.customMetadata }
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
                    notes: { include: { createdByUser: { select: { id: true, displayName: true, avatarSeed: true } } }, orderBy: [{ isPinned: 'desc' as const }, { createdAt: 'desc' as const }] },
                    attachments: { include: { createdByUser: { select: { id: true, displayName: true, avatarSeed: true } } }, orderBy: { createdAt: 'desc' as const } },
                },
            });
        });

        await this.prisma.auditLog.create({
            data: {
                userId,
                action: AuditAction.UPDATE_ASSET,
                targetId: updated.id,
                details: JSON.stringify({
                    name: updated.name,
                    type: updated.type,
                }),
            },
        });

        return this.toDetail(updated);
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
