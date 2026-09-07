import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetStatus, AssetType, AuditAction, Prisma } from '@prisma/client';
import { CredentialsService } from '../credentials/credentials.service';
import { evaluateAssetCompleteness } from '../data-quality/completeness';

type AssetWithRelations = Prisma.AssetGetPayload<{
  include: {
    patchInfo: true;
    ipAllocations: {
      include: {
        credentialLinks: { select: { credentialId: true } };
      };
    };
    parent: true;
    children: true;
    credentials: true;
    componentLinks: true;
    documentLinks: {
      include: {
        document: { select: { id: true; title: true; updatedAt: true } };
      };
    };
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

  private normalizeComponentLinks(dto: CreateAssetDto | UpdateAssetDto) {
    if (dto.componentLinks !== undefined && dto.componentIds !== undefined) {
      throw new BadRequestException(
        'Use either componentLinks or componentIds, not both.',
      );
    }

    const rawLinks =
      dto.componentLinks ??
      dto.componentIds?.map((componentId, index) => ({
        componentId,
        relationType: index === 0 ? 'PRIMARY' : 'SHARED',
        responsibleParty: undefined,
      }));

    if (rawLinks === undefined) return undefined;

    const links = rawLinks.map((link) => ({
      componentId: link.componentId.trim(),
      relationType: link.relationType.trim().toUpperCase(),
      responsibleParty: link.responsibleParty?.trim() || null,
    }));

    if (links.some((link) => !link.componentId)) {
      throw new BadRequestException('Component link IDs cannot be empty.');
    }
    if (
      links.some(
        (link) =>
          link.relationType !== 'PRIMARY' && link.relationType !== 'SHARED',
      )
    ) {
      throw new BadRequestException(
        'Component relation type must be PRIMARY or SHARED.',
      );
    }

    const componentIds = links.map((link) => link.componentId);
    if (new Set(componentIds).size !== componentIds.length) {
      throw new BadRequestException('Asset component links must be unique.');
    }
    if (links.filter((link) => link.relationType === 'PRIMARY').length > 1) {
      throw new BadRequestException(
        'An asset can have at most one PRIMARY application component relationship.',
      );
    }

    return links;
  }

  private async validateComponentLinks(dto: CreateAssetDto | UpdateAssetDto) {
    const links = this.normalizeComponentLinks(dto);
    if (!links?.length) return links;

    const ids = links.map((link) => link.componentId);
    const count = await this.prisma.applicationComponent.count({
      where: { id: { in: ids } },
    });
    if (count !== ids.length) {
      throw new BadRequestException(
        'Asset component links must reference existing application components',
      );
    }

    return links;
  }

  private credentialIdsForIp(ip: {
    credentialId?: string;
    credentialIds?: string[];
  }) {
    return [
      ...(ip.credentialIds ?? []),
      ...(ip.credentialId ? [ip.credentialId] : []),
    ]
      .map((id) => id.trim())
      .filter(
        (id, index, values) => Boolean(id) && values.indexOf(id) === index,
      );
  }

  private async writeAccessPointCredentialLinks(
    tx: Prisma.TransactionClient,
    assetId: string,
    ips: NonNullable<CreateAssetDto['ips']>,
    allowedCredentialIds: Set<string>,
  ) {
    const requested = ips.flatMap((ip) =>
      this.credentialIdsForIp(ip).map((credentialId) => ({
        address: ip.address.trim(),
        credentialId,
      })),
    );
    if (!requested.length) return;

    const unknownCredentialId = requested.find(
      ({ credentialId }) => !allowedCredentialIds.has(credentialId),
    )?.credentialId;
    if (unknownCredentialId) {
      throw new BadRequestException(
        'Asset Access Point credentials must reference credentials belonging to this asset.',
      );
    }

    const addresses = [...new Set(requested.map(({ address }) => address))];
    const allocations = await tx.iPAllocation.findMany({
      where: { assetId, address: { in: addresses } },
      select: { id: true, address: true },
    });
    const allocationByAddress = new Map(
      allocations.map((allocation) => [allocation.address, allocation.id]),
    );
    const missingAddress = addresses.find(
      (address) => !allocationByAddress.has(address),
    );
    if (missingAddress) {
      throw new BadRequestException(
        `Access Point ${missingAddress} was not persisted for this asset.`,
      );
    }

    await tx.iPAllocationCredential.createMany({
      data: requested.map(({ address, credentialId }) => ({
        ipAllocationId: allocationByAddress.get(address)!,
        credentialId,
      })),
      skipDuplicates: true,
    });
  }

  private buildCreateRelations(dto: CreateAssetDto | UpdateAssetDto) {
    const componentLinks = this.normalizeComponentLinks(dto);
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
                // A new asset cannot safely reference a credential before the
                // asset row exists; link interface credentials on the edit flow.
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
                  ...(credential.id?.trim()
                    ? { id: credential.id.trim() }
                    : {}),
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
      ...(componentLinks !== undefined
        ? {
            componentLinks: {
              create: componentLinks,
            },
          }
        : {}),
    };
  }

  private buildReplaceRelations(
    dto: CreateAssetDto | UpdateAssetDto,
    existingEncryptedPasswords = new Map<string, string>(),
  ) {
    const componentLinks = this.normalizeComponentLinks(dto);
    return {
      // Recreate credentials before IP allocations so explicit FK links can
      // connect to preserved credential IDs in the same nested write.
      ...(dto.credentials !== undefined
        ? {
            credentials: {
              deleteMany: {},
              create: (dto.credentials ?? [])
                .filter((credential) => credential.username.trim())
                .map((credential) => ({
                  ...(credential.id ? { id: credential.id } : {}),
                  username: credential.username.trim(),
                  type: credential.type?.trim() || null,
                  nodeLabel: credential.nodeLabel?.trim() || null,
                  manageType: credential.manageType?.trim() || null,
                  version: credential.version?.trim() || null,
                  encryptedPassword:
                    credential.id?.trim() && !credential.password
                      ? (existingEncryptedPasswords.get(credential.id.trim()) ??
                        this.credentialsService.encrypt(
                          credential.password ?? '',
                        ))
                      : this.credentialsService.encrypt(
                          credential.password ?? '',
                        ),
                })),
            },
          }
        : {}),
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
      ...(componentLinks !== undefined
        ? {
            componentLinks: {
              deleteMany: {},
              create: componentLinks,
            },
          }
        : {}),
    };
  }

  private toDetail(asset: AssetWithRelations) {
    const quality = evaluateAssetCompleteness({
      owner: asset.owner,
      location: asset.location,
      serialNumber: asset.sn,
      ipCount: asset.ipAllocations.length,
      warrantyExpiration: asset.warrantyExpiration,
    });

    return {
      ...asset,
      quality,
      ipAllocations: asset.ipAllocations.map((allocation) => {
        const { credentialLinks, ...rest } = allocation;
        return {
          ...rest,
          credentialIds: credentialLinks.map((link) => link.credentialId),
        };
      }),
      documentLinks: asset.documentLinks.map(({ document }) => document),
      credentials: asset.credentials.map((credential) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { encryptedPassword, ...rest } = credential;
        return rest;
      }),
    };
  }

  private async validateParentSelection(
    currentAssetId: string | undefined,
    parentId: string | null | undefined,
  ) {
    const normalizedParentId = parentId?.trim();
    if (!normalizedParentId) return;

    if (currentAssetId && normalizedParentId === currentAssetId) {
      throw new BadRequestException('An asset cannot be its own parent.');
    }

    const visited = new Set<string>();
    let cursor: string | null = normalizedParentId;

    while (cursor) {
      if (currentAssetId && cursor === currentAssetId) {
        throw new BadRequestException(
          'Asset parent selection would create a hierarchy loop.',
        );
      }
      if (visited.has(cursor)) {
        throw new BadRequestException(
          'Asset parent hierarchy already contains a loop.',
        );
      }
      visited.add(cursor);

      const node: { id: string; parentId: string | null } | null =
        await this.prisma.asset.findUnique({
          where: { id: cursor },
          select: { id: true, parentId: true },
        });
      if (!node) {
        if (cursor === normalizedParentId) {
          throw new BadRequestException('Parent asset does not exist.');
        }
        throw new BadRequestException(
          'Asset parent hierarchy contains a missing record.',
        );
      }
      cursor = node.parentId;
    }
  }

  private normalizeOptionalIdentifier(value?: string | null) {
    if (value === undefined) return undefined;
    const normalized = value?.trim() ?? '';
    return normalized || null;
  }

  private async validateUniqueAssetIdentifiers(
    assetId?: string | null,
    sn?: string | null,
    currentAssetId?: string,
  ) {
    const normalizedAssetId = this.normalizeOptionalIdentifier(assetId);
    const normalizedSn = this.normalizeOptionalIdentifier(sn);
    const or: Prisma.AssetWhereInput[] = [];
    if (typeof normalizedAssetId === 'string')
      or.push({ assetId: normalizedAssetId });
    if (typeof normalizedSn === 'string') or.push({ sn: normalizedSn });

    if (or.length) {
      const duplicate = await this.prisma.asset.findFirst({
        where: {
          ...(currentAssetId ? { id: { not: currentAssetId } } : {}),
          OR: or,
        },
        select: { assetId: true, sn: true },
      });
      if (duplicate) {
        if (
          typeof normalizedAssetId === 'string' &&
          duplicate.assetId === normalizedAssetId
        ) {
          throw new BadRequestException(
            `Asset ID ${normalizedAssetId} is already in use.`,
          );
        }
        if (typeof normalizedSn === 'string' && duplicate.sn === normalizedSn) {
          throw new BadRequestException(
            `Serial Number ${normalizedSn} is already in use.`,
          );
        }
      }
    }

    return { assetId: normalizedAssetId, sn: normalizedSn };
  }

  async create(createAssetDto: CreateAssetDto, userId: string) {
    await this.validateParentSelection(undefined, createAssetDto.parentId);
    await this.validateComponentLinks(createAssetDto);
    const normalizedIdentity = await this.validateUniqueAssetIdentifiers(
      createAssetDto.assetId,
      createAssetDto.sn,
    );

    const credentials = (createAssetDto.credentials ?? []).filter(
      (credential) => credential.username.trim(),
    );
    const credentialIds = new Set(
      credentials
        .map((credential) => credential.id?.trim())
        .filter((id): id is string => Boolean(id)),
    );
    if (
      credentialIds.size !==
      credentials.filter((credential) => credential.id?.trim()).length
    ) {
      throw new BadRequestException('Asset credential IDs must be unique.');
    }

    const linkedCredentialIds = (createAssetDto.ips ?? []).flatMap((ip) =>
      this.credentialIdsForIp(ip),
    );
    if (linkedCredentialIds.some((id) => !credentialIds.has(id))) {
      throw new BadRequestException(
        'Asset Access Point credentials must reference credentials submitted for this asset.',
      );
    }
    if (credentialIds.size > 0) {
      const existingCredentialCount = await this.prisma.credential.count({
        where: { id: { in: [...credentialIds] } },
      });
      if (existingCredentialCount > 0) {
        throw new BadRequestException('Asset credential IDs must be new.');
      }
    }

    const {
      ips: _ips,
      credentials: _credentials,
      componentIds: _componentIds,
      componentLinks: _componentLinks,
      ...assetData
    } = createAssetDto;
    void _ips;
    void _credentials;
    void _componentIds;
    void _componentLinks;

    const created = await this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.create({
        data: {
          ...assetData,
          assetId: normalizedIdentity.assetId,
          sn: normalizedIdentity.sn,
          parentId: assetData.parentId === '' ? null : assetData.parentId,
          status: createAssetDto.status || AssetStatus.ACTIVE,
          createdByUserId: userId,
          ...this.buildCreateRelations(createAssetDto),
        },
        include: {
          patchInfo: true,
          ipAllocations: {
            include: {
              credentialLinks: { select: { credentialId: true } },
            },
          },
          parent: true,
          children: true,
          credentials: true,
          componentLinks: {
            include: {
              component: {
                select: {
                  id: true,
                  name: true,
                  environment: {
                    select: {
                      id: true,
                      name: true,
                      application: {
                        select: {
                          id: true,
                          name: true,
                          technicalOwner: true,
                          businessUnit: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          documentLinks: {
            include: {
              document: { select: { id: true, title: true, updatedAt: true } },
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
      });

      await this.writeAccessPointCredentialLinks(
        tx,
        asset.id,
        createAssetDto.ips ?? [],
        credentialIds,
      );
      return asset;
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

    return linkedCredentialIds.length
      ? this.findOne(typedCreated.id)
      : this.toDetail(typedCreated);
  }

  async lookup(q = '', limit = 20, excludeId?: string) {
    const query = q.trim();
    const take = Math.min(Math.max(limit, 1), 50);
    return this.prisma.asset.findMany({
      where: {
        status: { not: AssetStatus.ARCHIVED },
        ...(excludeId ? { id: { not: excludeId } } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' as const } },
                { assetId: { contains: query, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        assetId: true,
        name: true,
        type: true,
        location: true,
        parentId: true,
      },
      orderBy: [{ name: 'asc' }, { assetId: 'asc' }],
      take,
    });
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
      sortBy?: string;
      sortDir?: string;
    } = {},
  ) {
    const skip = (page - 1) * limit;
    const take = Math.min(limit, 200);
    const q = filters.q?.trim();
    const normalizedQuery = q?.toLowerCase();
    const matchingType = Object.values(AssetType).find(
      (value) => value.toLowerCase() === normalizedQuery,
    );
    const matchingStatus = Object.values(AssetStatus).find(
      (value) => value.toLowerCase() === normalizedQuery,
    );
    const searchConditions: Prisma.AssetWhereInput[] = q
      ? [
          { name: { contains: q, mode: 'insensitive' } },
          { assetId: { contains: q, mode: 'insensitive' } },
          { sn: { contains: q, mode: 'insensitive' } },
          { owner: { contains: q, mode: 'insensitive' } },
          { location: { contains: q, mode: 'insensitive' } },
          { rack: { contains: q, mode: 'insensitive' } },
          { brandModel: { contains: q, mode: 'insensitive' } },
          {
            ipAllocations: {
              some: { address: { contains: q, mode: 'insensitive' } },
            },
          },
          ...(matchingType ? [{ type: matchingType }] : []),
          ...(matchingStatus ? [{ status: matchingStatus }] : []),
        ]
      : [];
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
      ...(filters.status ? {} : { status: { not: AssetStatus.ARCHIVED } }),
      ...(searchConditions.length ? { OR: searchConditions } : {}),
    };

    const sortableFields = [
      'assetId',
      'name',
      'type',
      'rack',
      'sn',
      'status',
      'location',
      'brandModel',
      'owner',
      'createdAt',
    ] as const;
    const sortField = sortableFields.includes(
      filters.sortBy as (typeof sortableFields)[number],
    )
      ? (filters.sortBy as (typeof sortableFields)[number])
      : 'createdAt';
    const sortDirection = filters.sortDir === 'asc' ? 'asc' : 'desc';
    const orderBy = {
      [sortField]: sortDirection,
    } as Prisma.AssetOrderByWithRelationInput;

    const listSelect = {
      id: true,
      assetId: true,
      name: true,
      type: true,
      rack: true,
      location: true,
      status: true,
      brandModel: true,
      sn: true,
      parentId: true,
      createdAt: true,
      children: {
        select: {
          id: true,
          assetId: true,
          name: true,
          type: true,
          rack: true,
          location: true,
          status: true,
          brandModel: true,
          sn: true,
          parentId: true,
        },
        where: { status: { not: AssetStatus.ARCHIVED } },
        orderBy: { name: 'asc' as const },
      },
    } satisfies Prisma.AssetSelect;

    const [assets, total] = await Promise.all([
      this.prisma.asset.findMany({
        skip,
        take,
        where,
        select: listSelect,
        orderBy,
      }),
      this.prisma.asset.count({ where }),
    ]);

    return {
      data: assets,
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
      where: { status: { not: AssetStatus.ARCHIVED } },
      orderBy: { updatedAt: 'desc' },
    });

    const evaluations = assets.map((asset) => ({
      asset,
      evaluation: evaluateAssetCompleteness({
        owner: asset.owner,
        location: asset.location,
        serialNumber: asset.sn,
        ipCount: asset.ipAllocations.length,
        warrantyExpiration: asset.warrantyExpiration,
      }),
    }));

    const issues = evaluations.flatMap(({ asset, evaluation }) =>
      evaluation.needsContext
        ? [
            {
              id: asset.id,
              assetId: asset.assetId,
              name: asset.name,
              type: asset.type,
              issues: evaluation.missingFields,
              reasons: evaluation.reasons,
            },
          ]
        : [],
    );
    const operationalIssues = evaluations.flatMap(({ asset, evaluation }) =>
      evaluation.operationalReasons.length
        ? [
            {
              id: asset.id,
              assetId: asset.assetId,
              name: asset.name,
              type: asset.type,
              issues: evaluation.operationalReasons.map(
                (reason) => reason.label,
              ),
              reasons: evaluation.operationalReasons,
            },
          ]
        : [],
    );

    return {
      totalAssets: assets.length,
      completeAssets: assets.length - issues.length,
      issues,
      issueCount: issues.length,
      operationalIssues,
      operationalIssueCount: operationalIssues.length,
    };
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        patchInfo: true,
        ipAllocations: {
          include: {
            credentialLinks: { select: { credentialId: true } },
          },
        },
        parent: true,
        children: true,
        credentials: true,
        componentLinks: {
          include: {
            component: {
              select: {
                id: true,
                name: true,
                environment: {
                  select: {
                    id: true,
                    name: true,
                    application: {
                      select: {
                        id: true,
                        name: true,
                        technicalOwner: true,
                        businessUnit: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        documentLinks: {
          include: {
            document: { select: { id: true, title: true, updatedAt: true } },
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
    await this.validateParentSelection(id, updateAssetDto.parentId);
    const normalizedIdentity = await this.validateUniqueAssetIdentifiers(
      updateAssetDto.assetId,
      updateAssetDto.sn,
      id,
    );

    const { ips, credentials, componentIds, componentLinks, ...assetData } =
      updateAssetDto;
    const referencedCredentialIds = [
      ...new Set((ips ?? []).flatMap((ip) => this.credentialIdsForIp(ip))),
    ];
    const submittedCredentialIds = (credentials ?? [])
      .map((credential) => credential.id?.trim())
      .filter((value): value is string => Boolean(value));
    if (
      new Set(submittedCredentialIds).size !== submittedCredentialIds.length
    ) {
      throw new BadRequestException('Asset credential IDs must be unique.');
    }

    let existingCredentialRecords: Array<{
      id: string;
      encryptedPassword: string;
    }> = [];
    let allowedCredentialIds = new Set<string>();

    if (credentials !== undefined) {
      const existingById = submittedCredentialIds.length
        ? await this.prisma.credential.findMany({
            where: { id: { in: submittedCredentialIds } },
            select: { id: true, assetId: true, encryptedPassword: true },
          })
        : [];
      if (existingById.some((credential) => credential.assetId !== id)) {
        throw new BadRequestException(
          'Asset credential IDs cannot reference credentials owned by another asset.',
        );
      }
      existingCredentialRecords = existingById.map(
        ({ id: credentialId, encryptedPassword }) => ({
          id: credentialId,
          encryptedPassword,
        }),
      );
      allowedCredentialIds = new Set(submittedCredentialIds);
    } else if (referencedCredentialIds.length) {
      existingCredentialRecords = await this.prisma.credential.findMany({
        where: { assetId: id, id: { in: referencedCredentialIds } },
        select: { id: true, encryptedPassword: true },
      });
      allowedCredentialIds = new Set(
        existingCredentialRecords.map((credential) => credential.id),
      );
      if (allowedCredentialIds.size !== referencedCredentialIds.length) {
        throw new BadRequestException(
          'Asset Access Point credentials must reference credentials belonging to this asset.',
        );
      }
    }

    const normalizedCredentials = credentials?.map((credential) => ({
      ...credential,
      id: credential.id?.trim() || undefined,
    }));
    const normalizedIps = ips?.map((ip) => ({
      ...ip,
      credentialId: undefined,
      credentialIds: this.credentialIdsForIp(ip),
    }));

    const preservedLinks =
      credentials !== undefined && ips === undefined
        ? await this.prisma.iPAllocationCredential.findMany({
            where: { ipAllocation: { assetId: id } },
            select: { ipAllocationId: true, credentialId: true },
          })
        : [];

    await this.validateComponentLinks(updateAssetDto);

    const updated = await this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.update({
        where: { id },
        data: {
          ...assetData,
          ...(updateAssetDto.assetId !== undefined
            ? { assetId: normalizedIdentity.assetId }
            : {}),
          ...(updateAssetDto.sn !== undefined
            ? { sn: normalizedIdentity.sn }
            : {}),
          parentId: assetData.parentId === '' ? null : assetData.parentId,
          ...(updateAssetDto.customMetadata !== undefined
            ? {
                customMetadata:
                  updateAssetDto.customMetadata as Prisma.InputJsonValue,
              }
            : {}),
          ...(ips !== undefined ||
          credentials !== undefined ||
          componentIds !== undefined ||
          componentLinks !== undefined
            ? this.buildReplaceRelations(
                {
                  ...updateAssetDto,
                  ips: ips !== undefined ? (normalizedIps ?? []) : undefined,
                  credentials:
                    credentials !== undefined
                      ? (normalizedCredentials ?? [])
                      : undefined,
                  componentIds,
                  componentLinks,
                },
                new Map(
                  existingCredentialRecords.map((credential) => [
                    credential.id,
                    credential.encryptedPassword,
                  ]),
                ),
              )
            : {}),
        },
        include: {
          patchInfo: true,
          ipAllocations: {
            include: {
              credentialLinks: { select: { credentialId: true } },
            },
          },
          parent: true,
          children: true,
          credentials: true,
          componentLinks: {
            include: {
              component: {
                select: {
                  id: true,
                  name: true,
                  environment: {
                    select: {
                      id: true,
                      name: true,
                      application: {
                        select: {
                          id: true,
                          name: true,
                          technicalOwner: true,
                          businessUnit: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          documentLinks: {
            include: {
              document: { select: { id: true, title: true, updatedAt: true } },
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
      });

      if (ips !== undefined) {
        await this.writeAccessPointCredentialLinks(
          tx,
          id,
          normalizedIps ?? [],
          allowedCredentialIds,
        );
      } else if (credentials !== undefined && preservedLinks.length) {
        const linksToRestore = preservedLinks.filter(({ credentialId }) =>
          allowedCredentialIds.has(credentialId),
        );
        if (linksToRestore.length) {
          await tx.iPAllocationCredential.createMany({
            data: linksToRestore,
            skipDuplicates: true,
          });
        }
      }

      return asset;
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

    return ips !== undefined || credentials !== undefined
      ? this.findOne(id)
      : this.toDetail(typedUpdated);
  }
  async remove(id: string, userId: string) {
    const asset = await this.findOne(id);

    const archived = await this.prisma.asset.update({
      where: { id },
      data: { status: AssetStatus.ARCHIVED },
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

    return archived;
  }

  async restore(id: string, userId: string) {
    const asset = await this.prisma.asset.update({
      where: { id },
      data: { status: AssetStatus.ACTIVE },
    });
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.UPDATE_ASSET,
        targetId: id,
        details: JSON.stringify({
          name: asset.name,
          status: AssetStatus.ACTIVE,
          restored: true,
        }),
      },
    });
    return this.findOne(id);
  }
}
