import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  DatabaseAccountScope,
  DatabaseStatus,
  Prisma,
} from '@prisma/client';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { evaluateDatabaseCompleteness } from '../data-quality/completeness';
import { CreateDatabaseDto } from './dto/create-database.dto';
import { UpdateDatabaseDto } from './dto/update-database.dto';
import { LogicalDatabaseDto } from './dto/logical-database.dto';

type DatabaseWithAccounts = Prisma.DatabaseInventoryGetPayload<{
  include: {
    accounts: {
      include: { logicalDatabases: { select: { id: true; name: true } } };
    };
    logicalDatabases: {
      include: {
        components: {
          select: {
            id: true;
            name: true;
            environment: {
              select: {
                id: true;
                name: true;
                application: { select: { id: true; name: true } };
              };
            };
          };
        };
      };
    };
    documentLinks: {
      include: {
        document: { select: { id: true; title: true; updatedAt: true } };
      };
    };
    hostAsset: { select: { id: true; name: true; assetId: true } };
    hostVm: { select: { id: true; name: true; systemName: true } };
    createdByUser: true;
  };
}>;

@Injectable()
export class DatabasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialsService: CredentialsService,
  ) {}

  private sanitizeText(value?: string | null) {
    return value?.trim() || null;
  }

  private normalizeEnvironment(
    value?: string | null,
    existing?: string | null,
  ) {
    const normalized = this.sanitizeText(value)?.toUpperCase() ?? null;
    if (!normalized) return null;
    if (['PROD', 'UAT', 'TEST'].includes(normalized)) return normalized;
    if (existing && normalized === existing.trim().toUpperCase())
      return existing;
    throw new BadRequestException(
      'Database environment must be one of PROD, UAT, or TEST.',
    );
  }

  private buildAccounts(accounts: CreateDatabaseDto['accounts']) {
    return (accounts ?? [])
      .filter((account) => account.username.trim())
      .map((account) => {
        if (!account.password) {
          throw new BadRequestException(
            `Password is required for new database account ${account.username.trim()}`,
          );
        }
        const logicalDatabaseIds = [
          ...new Set(account.logicalDatabaseIds ?? []),
        ];
        const scope =
          account.scope ??
          (logicalDatabaseIds.length > 0
            ? DatabaseAccountScope.LOGICAL_DATABASES
            : DatabaseAccountScope.INSTANCE);
        return {
          username: account.username.trim(),
          role: this.sanitizeText(account.role),
          encryptedPassword: this.credentialsService.encrypt(account.password),
          privileges: (account.privileges ?? [])
            .map((privilege) => privilege.trim())
            .filter(Boolean),
          note: this.sanitizeText(account.note),
          scope,
        };
      });
  }

  private async validateLogicalDatabaseScopes(
    databaseId: string | undefined,
    accounts: CreateDatabaseDto['accounts'],
  ) {
    const ids = new Set<string>();
    for (const account of accounts ?? []) {
      const logicalDatabaseIds = [...new Set(account.logicalDatabaseIds ?? [])];
      const scope =
        account.scope ??
        (logicalDatabaseIds.length > 0
          ? DatabaseAccountScope.LOGICAL_DATABASES
          : DatabaseAccountScope.INSTANCE);

      if (
        scope === DatabaseAccountScope.INSTANCE &&
        logicalDatabaseIds.length > 0
      ) {
        throw new BadRequestException(
          `Instance-wide account ${account.username.trim()} cannot select Logical Databases`,
        );
      }
      if (
        scope === DatabaseAccountScope.LOGICAL_DATABASES &&
        logicalDatabaseIds.length === 0
      ) {
        throw new BadRequestException(
          `Logical-database-scoped account ${account.username.trim()} must select at least one Logical Database`,
        );
      }
      logicalDatabaseIds.forEach((logicalId) => ids.add(logicalId));
    }

    if (!ids.size) return;
    if (!databaseId) {
      throw new BadRequestException(
        'Logical database scopes require a saved database inventory',
      );
    }
    const matches = await this.prisma.logicalDatabase.count({
      where: { id: { in: [...ids] }, databaseInventoryId: databaseId },
    });
    if (matches !== ids.size) {
      throw new BadRequestException(
        'Each logical database scope must belong to this database inventory',
      );
    }
  }

  private async validateHostIdentity(input: {
    host?: string | null;
    hostAssetId?: string | null;
    hostVmId?: string | null;
  }) {
    const host = this.sanitizeText(input.host);
    const hostAssetId = this.sanitizeText(input.hostAssetId);
    const hostVmId = this.sanitizeText(input.hostVmId);

    if (hostAssetId && hostVmId) {
      throw new BadRequestException(
        'Choose either a Host Asset or Host VM, not both.',
      );
    }
    if (!host && !hostAssetId && !hostVmId) {
      throw new BadRequestException(
        'Database identity requires a host name, Host Asset, or Host VM.',
      );
    }
    if (hostAssetId) {
      const asset = await this.prisma.asset.findUnique({
        where: { id: hostAssetId },
        select: { id: true },
      });
      if (!asset) {
        throw new BadRequestException(
          `Host Asset ${hostAssetId} was not found.`,
        );
      }
    }
    if (hostVmId) {
      const vm = await this.prisma.vmInventory.findUnique({
        where: { id: hostVmId },
        select: { id: true },
      });
      if (!vm) {
        throw new BadRequestException(`Host VM ${hostVmId} was not found.`);
      }
    }

    return { host, hostAssetId, hostVmId };
  }

  private validateAccountUsernames(accounts: CreateDatabaseDto['accounts']) {
    const usernames = (accounts ?? [])
      .map((account) => account.username.trim())
      .filter(Boolean);
    if (new Set(usernames).size !== usernames.length) {
      throw new BadRequestException(
        'Database account usernames must be unique within an Instance.',
      );
    }
  }

  private async syncLogicalDatabases(databaseId: string, names: string[]) {
    const desired = [
      ...new Set(names.map((name) => name.trim()).filter(Boolean)),
    ];
    const existing = await this.prisma.logicalDatabase.findMany({
      where: { databaseInventoryId: databaseId },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });
    const existingByName = new Map(existing.map((item) => [item.name, item]));

    for (const name of desired) {
      const current = existingByName.get(name);
      if (!current) {
        await this.prisma.logicalDatabase.create({
          data: { databaseInventoryId: databaseId, name },
        });
        continue;
      }
      if (current.status === DatabaseStatus.ARCHIVED) {
        await this.prisma.logicalDatabase.update({
          where: { id: current.id },
          data: { status: DatabaseStatus.ACTIVE },
        });
      }
    }

    const desiredSet = new Set(desired);
    for (const item of existing) {
      if (
        !desiredSet.has(item.name) &&
        item.status !== DatabaseStatus.ARCHIVED
      ) {
        await this.prisma.logicalDatabase.update({
          where: { id: item.id },
          data: { status: DatabaseStatus.ARCHIVED },
        });
      }
    }
  }

  private toListItem(database: DatabaseWithAccounts) {
    const quality = evaluateDatabaseCompleteness({
      host: database.host,
      hostAssetId: database.hostAssetId,
      hostVmId: database.hostVmId,
      ipAddress: database.ipAddress,
      owner: database.owner,
      environment: database.environment,
      backupPolicy: database.backupPolicy,
      accountCount: database.accounts.length,
    });

    return {
      id: database.id,
      name: database.name,
      engine: database.engine,
      version: database.version,
      environment: database.environment,
      host: database.host,
      ipAddress: database.ipAddress,
      port: database.port,
      serviceName: database.serviceName,
      owner: database.owner,
      backupPolicy: database.backupPolicy,
      replication: database.replication,
      linkedApps: database.linkedApps,
      maintenanceWindow: database.maintenanceWindow,
      status: database.status,
      note: database.note,
      responsibleParty: database.responsibleParty,
      hostAsset: database.hostAsset,
      hostVm: database.hostVm,
      quality,
      documentLinks: database.documentLinks.map(({ document }) => document),
      accountsCount: database.accounts.length,
      logicalDatabases: database.logicalDatabases.map((logicalDatabase) => ({
        id: logicalDatabase.id,
        name: logicalDatabase.name,
        description: logicalDatabase.description,
        status: logicalDatabase.status,
        componentIds: logicalDatabase.components.map(
          (component) => component.id,
        ),
        components: logicalDatabase.components.map((component) => ({
          id: component.id,
          name: component.name,
          environment: {
            id: component.environment.id,
            name: component.environment.name,
          },
          application: component.environment.application,
        })),
      })),
      createdAt: database.createdAt,
      updatedAt: database.updatedAt,
    };
  }

  private toDetail(database: DatabaseWithAccounts) {
    return {
      ...this.toListItem(database),
      accounts: database.accounts.map((account) => ({
        id: account.id,
        username: account.username,
        role: account.role,
        hasPassword: !!account.encryptedPassword,
        privileges: account.privileges,
        note: account.note,
        scope: account.scope,
        logicalDatabaseIds: account.logicalDatabases.map(
          (logical) => logical.id,
        ),
        logicalDatabaseNames: account.logicalDatabases.map(
          (logical) => logical.name,
        ),
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      })),
    };
  }

  async create(createDatabaseDto: CreateDatabaseDto, userId: string) {
    this.validateAccountUsernames(createDatabaseDto.accounts);
    await this.validateLogicalDatabaseScopes(
      undefined,
      createDatabaseDto.accounts,
    );
    const hostIdentity = await this.validateHostIdentity({
      host: createDatabaseDto.host,
      hostAssetId: createDatabaseDto.hostAssetId,
      hostVmId: createDatabaseDto.hostVmId,
    });
    const accountCreates = this.buildAccounts(createDatabaseDto.accounts);

    const created = await this.prisma.databaseInventory.create({
      data: {
        name: createDatabaseDto.name.trim(),
        engine: createDatabaseDto.engine.trim(),
        version: this.sanitizeText(createDatabaseDto.version),
        environment: this.normalizeEnvironment(createDatabaseDto.environment),
        host: hostIdentity.host,
        ipAddress: this.sanitizeText(createDatabaseDto.ipAddress),
        port: this.sanitizeText(createDatabaseDto.port),
        serviceName: this.sanitizeText(createDatabaseDto.serviceName),
        owner: this.sanitizeText(createDatabaseDto.owner),
        backupPolicy: this.sanitizeText(createDatabaseDto.backupPolicy),
        replication: this.sanitizeText(createDatabaseDto.replication),
        linkedApps: (createDatabaseDto.linkedApps ?? [])
          .map((app) => app.trim())
          .filter(Boolean),
        maintenanceWindow: this.sanitizeText(
          createDatabaseDto.maintenanceWindow,
        ),
        status: createDatabaseDto.status
          ? (this.sanitizeText(createDatabaseDto.status) as DatabaseStatus)
          : undefined,
        note: this.sanitizeText(createDatabaseDto.note),
        responsibleParty: this.sanitizeText(createDatabaseDto.responsibleParty),
        hostAssetId: hostIdentity.hostAssetId,
        hostVmId: hostIdentity.hostVmId,
        createdByUserId: userId,
        ...(accountCreates.length
          ? {
              accounts: {
                create: accountCreates,
              },
            }
          : {}),
        logicalDatabases: {
          create: (createDatabaseDto.logicalDatabases ?? [])
            .filter(Boolean)
            .map((name) => ({ name: name.trim() })),
        },
      },
      include: {
        accounts: {
          include: { logicalDatabases: { select: { id: true, name: true } } },
        },
        logicalDatabases: {
          include: {
            components: {
              select: {
                id: true,
                name: true,
                environment: {
                  select: {
                    id: true,
                    name: true,
                    application: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
        hostAsset: { select: { id: true, name: true, assetId: true } },
        hostVm: { select: { id: true, name: true, systemName: true } },
        createdByUser: true,
        documentLinks: {
          include: {
            document: { select: { id: true, title: true, updatedAt: true } },
          },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.CREATE_DATABASE,
        targetId: created.id,
        details: JSON.stringify({
          name: created.name,
          engine: created.engine,
          host: created.host,
          hostAssetId: created.hostAssetId,
          hostVmId: created.hostVmId,
        }),
      },
    });

    return this.toDetail(created);
  }

  async getHostOptions(q = '') {
    const query = q.trim();
    const [assets, vms] = await Promise.all([
      this.prisma.asset.findMany({
        where: {
          status: { not: 'ARCHIVED' },
          ...(query
            ? {
                OR: [
                  { name: { contains: query, mode: 'insensitive' as const } },
                  {
                    assetId: { contains: query, mode: 'insensitive' as const },
                  },
                ],
              }
            : {}),
        },
        take: 25,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          assetId: true,
          type: true,
          location: true,
        },
      }),
      this.prisma.vmInventory.findMany({
        where: {
          lifecycleState: { not: 'ARCHIVED' },
          ...(query
            ? {
                OR: [
                  { name: { contains: query, mode: 'insensitive' as const } },
                  {
                    systemName: {
                      contains: query,
                      mode: 'insensitive' as const,
                    },
                  },
                  {
                    primaryIp: {
                      contains: query,
                      mode: 'insensitive' as const,
                    },
                  },
                ],
              }
            : {}),
        },
        take: 25,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          systemName: true,
          primaryIp: true,
          lifecycleState: true,
        },
      }),
    ]);

    return { assets, vms };
  }

  async getLogicalDatabaseOptions() {
    const logicalDatabases = await this.prisma.logicalDatabase.findMany({
      where: {
        status: { not: DatabaseStatus.ARCHIVED },
        databaseInventory: { status: { not: DatabaseStatus.ARCHIVED } },
      },
      orderBy: [{ databaseInventory: { name: 'asc' } }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        databaseInventory: { select: { id: true, name: true } },
      },
    });

    return logicalDatabases.map((logical) => ({
      id: logical.id,
      name: logical.name,
      databaseId: logical.databaseInventory.id,
      databaseName: logical.databaseInventory.name,
      label: `${logical.databaseInventory.name} · ${logical.name}`,
    }));
  }

  async findAll(
    page = 1,
    limit = 20,
    filters: {
      q?: string;
      environment?: string;
      includeArchived?: boolean;
      sortBy?: string;
      sortDir?: string;
    } = {},
  ) {
    const safePage = Math.max(page, 1);
    const take = Math.min(Math.max(limit, 1), 200);
    const skip = (safePage - 1) * take;
    const q = filters.q?.trim();

    const searchConditions: Prisma.DatabaseInventoryWhereInput[] = q
      ? [
          { name: { contains: q, mode: 'insensitive' } },
          { engine: { contains: q, mode: 'insensitive' } },
          { version: { contains: q, mode: 'insensitive' } },
          { environment: { contains: q, mode: 'insensitive' } },
          { host: { contains: q, mode: 'insensitive' } },
          { ipAddress: { contains: q, mode: 'insensitive' } },
          { port: { contains: q, mode: 'insensitive' } },
          { serviceName: { contains: q, mode: 'insensitive' } },
          { owner: { contains: q, mode: 'insensitive' } },
          {
            hostAsset: {
              is: { name: { contains: q, mode: 'insensitive' } },
            },
          },
          {
            hostVm: {
              is: {
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { systemName: { contains: q, mode: 'insensitive' } },
                ],
              },
            },
          },
        ]
      : [];

    const baseWhere: Prisma.DatabaseInventoryWhereInput = {
      ...(filters.includeArchived
        ? {}
        : { status: { not: DatabaseStatus.ARCHIVED } }),
      ...(searchConditions.length ? { OR: searchConditions } : {}),
    };
    const where: Prisma.DatabaseInventoryWhereInput = {
      ...baseWhere,
      ...(filters.environment ? { environment: filters.environment } : {}),
    };

    const sortableFields = [
      'name',
      'engine',
      'version',
      'environment',
      'host',
      'ipAddress',
      'status',
      'createdAt',
      'updatedAt',
    ] as const;
    const sortField = sortableFields.includes(
      filters.sortBy as (typeof sortableFields)[number],
    )
      ? (filters.sortBy as (typeof sortableFields)[number])
      : 'createdAt';
    const sortDirection = filters.sortDir === 'asc' ? 'asc' : 'desc';
    const orderBy = {
      [sortField]: sortDirection,
    } as Prisma.DatabaseInventoryOrderByWithRelationInput;

    const listSelect = {
      id: true,
      name: true,
      engine: true,
      version: true,
      environment: true,
      host: true,
      ipAddress: true,
      port: true,
      status: true,
      owner: true,
      backupPolicy: true,
      hostAsset: { select: { id: true, name: true, assetId: true } },
      hostVm: { select: { id: true, name: true, systemName: true } },
      _count: { select: { accounts: true } },
      createdAt: true,
      updatedAt: true,
    } satisfies Prisma.DatabaseInventorySelect;

    const [databases, total, prodCount, uatCount, testCount] =
      await Promise.all([
        this.prisma.databaseInventory.findMany({
          skip,
          take,
          where,
          select: listSelect,
          orderBy,
        }),
        this.prisma.databaseInventory.count({ where }),
        this.prisma.databaseInventory.count({
          where: { ...baseWhere, environment: 'PROD' },
        }),
        this.prisma.databaseInventory.count({
          where: { ...baseWhere, environment: 'UAT' },
        }),
        this.prisma.databaseInventory.count({
          where: { ...baseWhere, environment: 'TEST' },
        }),
      ]);

    const data = databases.map((database) => {
      const evaluation = evaluateDatabaseCompleteness({
        host: database.host,
        hostAssetId: database.hostAsset?.id,
        hostVmId: database.hostVm?.id,
        ipAddress: database.ipAddress,
        owner: database.owner,
        environment: database.environment,
        backupPolicy: database.backupPolicy,
        accountCount: database._count.accounts,
      });
      return {
        id: database.id,
        name: database.name,
        engine: database.engine,
        version: database.version,
        environment: database.environment,
        host: database.host,
        ipAddress: database.ipAddress,
        port: database.port,
        status: database.status,
        owner: database.owner,
        backupPolicy: database.backupPolicy,
        hostAsset: database.hostAsset,
        hostVm: database.hostVm,
        accountsCount: database._count.accounts,
        needsContext: evaluation.needsContext,
        contextIssues: evaluation.missingFields,
        contextReasons: evaluation.reasons,
        createdAt: database.createdAt,
        updatedAt: database.updatedAt,
      };
    });

    return {
      data,
      total,
      page: safePage,
      limit: take,
      totalPages: Math.ceil(total / take),
      environmentCounts: {
        ALL: await this.prisma.databaseInventory.count({ where: baseWhere }),
        PROD: prodCount,
        UAT: uatCount,
        TEST: testCount,
      },
    };
  }

  async getDataQualitySummary() {
    const databases = await this.prisma.databaseInventory.findMany({
      where: { status: { not: DatabaseStatus.ARCHIVED } },
      select: {
        id: true,
        name: true,
        engine: true,
        host: true,
        hostAssetId: true,
        hostVmId: true,
        ipAddress: true,
        owner: true,
        environment: true,
        backupPolicy: true,
        accounts: { select: { id: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const evaluations = databases.map((database) => ({
      database,
      evaluation: evaluateDatabaseCompleteness({
        host: database.host,
        hostAssetId: database.hostAssetId,
        hostVmId: database.hostVmId,
        ipAddress: database.ipAddress,
        owner: database.owner,
        environment: database.environment,
        backupPolicy: database.backupPolicy,
        accountCount: database.accounts.length,
      }),
    }));

    const issues = evaluations.flatMap(({ database, evaluation }) =>
      evaluation.needsContext
        ? [
            {
              id: database.id,
              name: database.name,
              engine: database.engine,
              issues: evaluation.missingFields,
              reasons: evaluation.reasons,
            },
          ]
        : [],
    );

    return {
      totalDatabases: databases.length,
      completeDatabases: databases.length - issues.length,
      issueCount: issues.length,
      issues,
      operationalIssues: [],
      operationalIssueCount: 0,
    };
  }

  async findOne(id: string) {
    const database = await this.prisma.databaseInventory.findUnique({
      where: { id },
      include: {
        accounts: {
          include: { logicalDatabases: { select: { id: true, name: true } } },
        },
        logicalDatabases: {
          include: {
            components: {
              select: {
                id: true,
                name: true,
                environment: {
                  select: {
                    id: true,
                    name: true,
                    application: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
        hostAsset: { select: { id: true, name: true, assetId: true } },
        hostVm: { select: { id: true, name: true, systemName: true } },
        createdByUser: true,
        documentLinks: {
          include: {
            document: { select: { id: true, title: true, updatedAt: true } },
          },
        },
      },
    });

    if (!database) {
      throw new NotFoundException(`Database ${id} not found`);
    }

    return this.toDetail(database);
  }

  private async prepareAccountMutation(
    databaseId: string,
    accounts: UpdateDatabaseDto['accounts'],
    removedAccountIds: string[] | undefined,
  ) {
    if (accounts === undefined && removedAccountIds === undefined)
      return undefined;

    const existing = await this.prisma.databaseAccount.findMany({
      where: { databaseInventoryId: databaseId },
      select: { id: true, username: true },
    });
    const existingById = new Map(
      existing.map((account) => [account.id, account]),
    );
    const removedIds = [...new Set(removedAccountIds ?? [])];
    const removedSet = new Set(removedIds);

    for (const removedId of removedIds) {
      if (!existingById.has(removedId)) {
        throw new BadRequestException(
          `Database account ${removedId} does not belong to this Instance.`,
        );
      }
    }

    const incoming = accounts ?? [];
    this.validateAccountUsernames(incoming);
    const incomingIds = new Set<string>();
    for (const account of incoming) {
      if (!account.id) continue;
      if (incomingIds.has(account.id)) {
        throw new BadRequestException(
          `Database account ${account.id} was submitted more than once.`,
        );
      }
      incomingIds.add(account.id);
      if (!existingById.has(account.id)) {
        throw new BadRequestException(
          `Database account ${account.id} does not belong to this Instance.`,
        );
      }
      if (removedSet.has(account.id)) {
        throw new BadRequestException(
          `Database account ${account.id} cannot be updated and removed in the same request.`,
        );
      }
    }

    const finalUsernames = new Map<string, string>();
    for (const existingAccount of existing) {
      if (!removedSet.has(existingAccount.id)) {
        finalUsernames.set(existingAccount.id, existingAccount.username);
      }
    }
    incoming.forEach((account, index) => {
      finalUsernames.set(account.id ?? `new:${index}`, account.username.trim());
    });
    const usernames = [...finalUsernames.values()].filter(Boolean);
    if (new Set(usernames).size !== usernames.length) {
      throw new BadRequestException(
        'Database account usernames must be unique within an Instance.',
      );
    }

    const updates: Array<{
      where: { id: string };
      data: Prisma.DatabaseAccountUpdateWithoutDatabaseInventoryInput;
    }> = [];
    const creates: Prisma.DatabaseAccountCreateWithoutDatabaseInventoryInput[] =
      [];

    for (const account of incoming) {
      const logicalDatabaseIds = [...new Set(account.logicalDatabaseIds ?? [])];
      const scope =
        account.scope ??
        (logicalDatabaseIds.length > 0
          ? DatabaseAccountScope.LOGICAL_DATABASES
          : DatabaseAccountScope.INSTANCE);
      const common = {
        username: account.username.trim(),
        role: this.sanitizeText(account.role),
        privileges: (account.privileges ?? [])
          .map((privilege) => privilege.trim())
          .filter(Boolean),
        note: this.sanitizeText(account.note),
        scope,
      };

      if (account.id) {
        updates.push({
          where: { id: account.id },
          data: {
            ...common,
            ...(account.password
              ? {
                  encryptedPassword: this.credentialsService.encrypt(
                    account.password,
                  ),
                }
              : {}),
            logicalDatabases: {
              set:
                scope === DatabaseAccountScope.LOGICAL_DATABASES
                  ? logicalDatabaseIds.map((id) => ({ id }))
                  : [],
            },
          },
        });
      } else {
        if (!account.password) {
          throw new BadRequestException(
            `Password is required for new database account ${account.username.trim()}`,
          );
        }
        creates.push({
          ...common,
          encryptedPassword: this.credentialsService.encrypt(account.password),
          ...(scope === DatabaseAccountScope.LOGICAL_DATABASES
            ? {
                logicalDatabases: {
                  connect: logicalDatabaseIds.map((id) => ({ id })),
                },
              }
            : {}),
        });
      }
    }

    if (!removedIds.length && !updates.length && !creates.length)
      return undefined;
    return {
      ...(removedIds.length ? { deleteMany: { id: { in: removedIds } } } : {}),
      ...(updates.length ? { update: updates } : {}),
      ...(creates.length ? { create: creates } : {}),
    };
  }

  async update(
    id: string,
    updateDatabaseDto: UpdateDatabaseDto,
    userId: string,
  ) {
    const current = await this.prisma.databaseInventory.findUnique({
      where: { id },
      select: {
        id: true,
        environment: true,
        host: true,
        hostAssetId: true,
        hostVmId: true,
      },
    });
    if (!current) {
      throw new NotFoundException(`Database ${id} not found`);
    }

    await this.validateLogicalDatabaseScopes(id, updateDatabaseDto.accounts);
    const hostIdentity = await this.validateHostIdentity({
      host:
        updateDatabaseDto.host !== undefined
          ? updateDatabaseDto.host
          : current.host,
      hostAssetId:
        updateDatabaseDto.hostAssetId !== undefined
          ? updateDatabaseDto.hostAssetId
          : current.hostAssetId,
      hostVmId:
        updateDatabaseDto.hostVmId !== undefined
          ? updateDatabaseDto.hostVmId
          : current.hostVmId,
    });
    const accountMutation = await this.prepareAccountMutation(
      id,
      updateDatabaseDto.accounts,
      updateDatabaseDto.removedAccountIds,
    );

    const updated = await this.prisma.databaseInventory.update({
      where: { id },
      data: {
        ...(updateDatabaseDto.name !== undefined
          ? { name: updateDatabaseDto.name.trim() }
          : {}),
        ...(updateDatabaseDto.engine !== undefined
          ? { engine: updateDatabaseDto.engine.trim() }
          : {}),
        ...(updateDatabaseDto.version !== undefined
          ? { version: this.sanitizeText(updateDatabaseDto.version) }
          : {}),
        ...(updateDatabaseDto.environment !== undefined
          ? {
              environment: this.normalizeEnvironment(
                updateDatabaseDto.environment,
                current.environment,
              ),
            }
          : {}),
        host: hostIdentity.host,
        hostAssetId: hostIdentity.hostAssetId,
        hostVmId: hostIdentity.hostVmId,
        ...(updateDatabaseDto.ipAddress !== undefined
          ? { ipAddress: this.sanitizeText(updateDatabaseDto.ipAddress) }
          : {}),
        ...(updateDatabaseDto.port !== undefined
          ? { port: this.sanitizeText(updateDatabaseDto.port) }
          : {}),
        ...(updateDatabaseDto.serviceName !== undefined
          ? { serviceName: this.sanitizeText(updateDatabaseDto.serviceName) }
          : {}),
        ...(updateDatabaseDto.owner !== undefined
          ? { owner: this.sanitizeText(updateDatabaseDto.owner) }
          : {}),
        ...(updateDatabaseDto.backupPolicy !== undefined
          ? { backupPolicy: this.sanitizeText(updateDatabaseDto.backupPolicy) }
          : {}),
        ...(updateDatabaseDto.replication !== undefined
          ? { replication: this.sanitizeText(updateDatabaseDto.replication) }
          : {}),
        ...(updateDatabaseDto.linkedApps !== undefined
          ? {
              linkedApps: updateDatabaseDto.linkedApps
                .map((app) => app.trim())
                .filter(Boolean),
            }
          : {}),
        ...(updateDatabaseDto.maintenanceWindow !== undefined
          ? {
              maintenanceWindow: this.sanitizeText(
                updateDatabaseDto.maintenanceWindow,
              ),
            }
          : {}),
        ...(updateDatabaseDto.status !== undefined
          ? { status: updateDatabaseDto.status }
          : {}),
        ...(updateDatabaseDto.note !== undefined
          ? { note: this.sanitizeText(updateDatabaseDto.note) }
          : {}),
        ...(updateDatabaseDto.responsibleParty !== undefined
          ? {
              responsibleParty: this.sanitizeText(
                updateDatabaseDto.responsibleParty,
              ),
            }
          : {}),
        ...(accountMutation ? { accounts: accountMutation } : {}),
      },
      include: {
        accounts: {
          include: { logicalDatabases: { select: { id: true, name: true } } },
        },
        logicalDatabases: {
          include: {
            components: {
              select: {
                id: true,
                name: true,
                environment: {
                  select: {
                    id: true,
                    name: true,
                    application: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
        hostAsset: { select: { id: true, name: true, assetId: true } },
        hostVm: { select: { id: true, name: true, systemName: true } },
        createdByUser: true,
        documentLinks: {
          include: {
            document: { select: { id: true, title: true, updatedAt: true } },
          },
        },
      },
    });

    if (updateDatabaseDto.logicalDatabases !== undefined) {
      await this.syncLogicalDatabases(id, updateDatabaseDto.logicalDatabases);
    }

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.UPDATE_DATABASE,
        targetId: updated.id,
        details: JSON.stringify({
          name: updated.name,
          engine: updated.engine,
        }),
      },
    });

    return this.findOne(id);
  }

  async remove(id: string, userId: string) {
    const db = await this.findOne(id);
    const archived = await this.prisma.databaseInventory.update({
      where: { id },
      data: { status: DatabaseStatus.ARCHIVED },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.DELETE_DATABASE,
        targetId: id,
        details: JSON.stringify({
          name: db.name,
          host: db.host,
        }),
      },
    });

    return archived;
  }

  async restore(id: string, userId: string) {
    const restored = await this.prisma.databaseInventory.update({
      where: { id },
      data: { status: DatabaseStatus.ACTIVE },
    });
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.UPDATE_DATABASE,
        targetId: id,
        details: JSON.stringify({
          name: restored.name,
          status: DatabaseStatus.ACTIVE,
          restored: true,
        }),
      },
    });
    return this.findOne(id);
  }

  async createLogicalDatabase(
    id: string,
    dto: LogicalDatabaseDto,
    userId: string,
  ) {
    await this.findOne(id);
    if (dto.componentIds?.length) {
      const count = await this.prisma.applicationComponent.count({
        where: { id: { in: dto.componentIds } },
      });
      if (count !== new Set(dto.componentIds).size) {
        throw new BadRequestException(
          'Logical database component links must reference existing application components',
        );
      }
    }
    const logical = await this.prisma.logicalDatabase.create({
      data: {
        databaseInventoryId: id,
        name: dto.name.trim(),
        description: this.sanitizeText(dto.description),
        ...(dto.componentIds?.length
          ? {
              components: {
                connect: dto.componentIds.map((componentId) => ({
                  id: componentId,
                })),
              },
            }
          : {}),
      },
      include: {
        components: {
          select: {
            id: true,
            name: true,
            environment: {
              select: {
                id: true,
                name: true,
                application: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.UPDATE_DATABASE,
        targetId: id,
        details: JSON.stringify({ logicalDatabase: logical.name }),
      },
    });
    return logical;
  }

  async updateLogicalDatabase(
    id: string,
    logicalId: string,
    dto: LogicalDatabaseDto,
    userId: string,
  ) {
    const existing = await this.prisma.logicalDatabase.findFirst({
      where: { id: logicalId, databaseInventoryId: id },
    });
    if (!existing)
      throw new NotFoundException(`Logical database ${logicalId} not found`);
    if (dto.componentIds) {
      const ids = [...new Set(dto.componentIds)];
      const count = ids.length
        ? await this.prisma.applicationComponent.count({
            where: { id: { in: ids } },
          })
        : 0;
      if (count !== ids.length) {
        throw new BadRequestException(
          'Logical database component links must reference existing application components',
        );
      }
    }
    const logical = await this.prisma.logicalDatabase.update({
      where: { id: logicalId },
      data: {
        name: dto.name.trim(),
        description: this.sanitizeText(dto.description),
        ...(dto.componentIds
          ? {
              components: {
                set: dto.componentIds.map((componentId) => ({
                  id: componentId,
                })),
              },
            }
          : {}),
      },
      include: {
        components: {
          select: {
            id: true,
            name: true,
            environment: {
              select: {
                id: true,
                name: true,
                application: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.UPDATE_DATABASE,
        targetId: id,
        details: JSON.stringify({ logicalDatabase: logical.name }),
      },
    });
    return logical;
  }

  async deleteLogicalDatabase(id: string, logicalId: string, userId: string) {
    const existing = await this.prisma.logicalDatabase.findFirst({
      where: { id: logicalId, databaseInventoryId: id },
    });
    if (!existing)
      throw new NotFoundException(`Logical database ${logicalId} not found`);

    const archived = await this.prisma.logicalDatabase.update({
      where: { id: logicalId },
      data: { status: DatabaseStatus.ARCHIVED },
    });
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.UPDATE_DATABASE,
        targetId: id,
        details: JSON.stringify({
          logicalDatabase: existing.name,
          archived: true,
        }),
      },
    });
    return archived;
  }

  async restoreLogicalDatabase(id: string, logicalId: string, userId: string) {
    const existing = await this.prisma.logicalDatabase.findFirst({
      where: { id: logicalId, databaseInventoryId: id },
    });
    if (!existing) {
      throw new NotFoundException(`Logical database ${logicalId} not found`);
    }

    const restored = await this.prisma.logicalDatabase.update({
      where: { id: logicalId },
      data: { status: DatabaseStatus.ACTIVE },
    });
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.UPDATE_DATABASE,
        targetId: id,
        details: JSON.stringify({
          logicalDatabase: existing.name,
          restored: true,
        }),
      },
    });
    return restored;
  }

  async revealPassword(id: string, accountId: string, userId: string) {
    const db = await this.findOne(id);
    const account = await this.prisma.databaseAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.databaseInventoryId !== id) {
      throw new NotFoundException(
        `Account ${accountId} not found in database ${id}`,
      );
    }

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.VIEW_PASSWORD,
        targetId: account.id,
        details: JSON.stringify({
          databaseId: id,
          databaseName: db.name,
          account: account.username,
        }),
      },
    });

    return {
      password: this.credentialsService.decrypt(account.encryptedPassword),
    };
  }

  async recordCopy(id: string, accountId: string, userId: string) {
    const account = await this.prisma.databaseAccount.findFirst({
      where: { id: accountId, databaseInventoryId: id },
      select: { id: true, username: true },
    });
    if (!account)
      throw new NotFoundException(
        `Account ${accountId} not found in database ${id}`,
      );
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.COPY_PASSWORD,
        targetId: account.id,
        details: JSON.stringify({ databaseId: id, username: account.username }),
      },
    });
    return { recorded: true };
  }
}
