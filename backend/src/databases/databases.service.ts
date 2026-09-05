import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma, DatabaseStatus } from '@prisma/client';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDatabaseDto } from './dto/create-database.dto';
import { UpdateDatabaseDto } from './dto/update-database.dto';
import { LogicalDatabaseDto } from './dto/logical-database.dto';

type DatabaseWithAccounts = Prisma.DatabaseInventoryGetPayload<{
  include: {
    accounts: {
      include: { logicalDatabases: { select: { id: true; name: true } } };
    };
    logicalDatabases: { include: { components: true } };
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

  private buildAccounts(
    accounts: CreateDatabaseDto['accounts'] | UpdateDatabaseDto['accounts'],
  ) {
    return (accounts ?? [])
      .filter((account) => account.username.trim())
      .map((account) => ({
        username: account.username.trim(),
        role: this.sanitizeText(account.role),
        encryptedPassword: this.credentialsService.encrypt(
          account.password ?? '',
        ),
        privileges: (account.privileges ?? [])
          .map((privilege) => privilege.trim())
          .filter(Boolean),
        note: this.sanitizeText(account.note),
        scope: this.sanitizeText(account.scope) ?? 'INSTANCE',
      }));
  }

  private async validateLogicalDatabaseScopes(
    databaseId: string | undefined,
    accounts:
      | CreateDatabaseDto['accounts']
      | UpdateDatabaseDto['accounts']
      | undefined,
  ) {
    const ids = [
      ...new Set(
        (accounts ?? []).flatMap((account) => account.logicalDatabaseIds ?? []),
      ),
    ];
    if (!ids.length) return;
    if (!databaseId) {
      throw new BadRequestException(
        'Logical database scopes require a saved database inventory',
      );
    }
    const matches = await this.prisma.logicalDatabase.count({
      where: { id: { in: ids }, databaseInventoryId: databaseId },
    });
    if (matches !== ids.length) {
      throw new BadRequestException(
        'Each logical database scope must belong to this database inventory',
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
        _count: { select: { components: true, accounts: true } },
      },
    });
    const existingByName = new Map(existing.map((item) => [item.name, item]));
    for (const name of desired) {
      if (!existingByName.has(name)) {
        await this.prisma.logicalDatabase.create({
          data: { databaseInventoryId: databaseId, name },
        });
      }
    }
    for (const item of existing) {
      if (
        !desired.includes(item.name) &&
        item._count.components === 0 &&
        item._count.accounts === 0
      ) {
        await this.prisma.logicalDatabase.delete({ where: { id: item.id } });
      }
    }
  }

  private toListItem(database: DatabaseWithAccounts) {
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
      documentLinks: database.documentLinks.map(({ document }) => document),
      accountsCount: database.accounts.length,
      logicalDatabases: database.logicalDatabases.map((logicalDatabase) => ({
        id: logicalDatabase.id,
        name: logicalDatabase.name,
        description: logicalDatabase.description,
        componentIds: logicalDatabase.components.map(
          (component) => component.id,
        ),
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
    await this.validateLogicalDatabaseScopes(
      undefined,
      createDatabaseDto.accounts,
    );
    const created = await this.prisma.databaseInventory.create({
      data: {
        name: createDatabaseDto.name.trim(),
        engine: createDatabaseDto.engine.trim(),
        version: this.sanitizeText(createDatabaseDto.version),
        environment: this.sanitizeText(createDatabaseDto.environment),
        host: createDatabaseDto.host.trim(),
        ipAddress: createDatabaseDto.ipAddress.trim(),
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
        hostAssetId: this.sanitizeText(createDatabaseDto.hostAssetId),
        hostVmId: this.sanitizeText(createDatabaseDto.hostVmId),
        createdByUserId: userId,
        accounts: {
          create: this.buildAccounts(createDatabaseDto.accounts).map(
            (account, index) => ({
              ...account,
              ...(createDatabaseDto.accounts[index]?.logicalDatabaseIds?.length
                ? {
                    logicalDatabases: {
                      connect: createDatabaseDto.accounts[
                        index
                      ].logicalDatabaseIds.map((id) => ({ id })),
                    },
                  }
                : {}),
            }),
          ),
        },
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
        logicalDatabases: { include: { components: true } },
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
        }),
      },
    });

    return this.toDetail(created);
  }

  async findAll(includeArchived = false) {
    const databases = await this.prisma.databaseInventory.findMany({
      take: 1000,
      where: includeArchived
        ? {}
        : { status: { not: DatabaseStatus.ARCHIVED } },
      include: {
        accounts: {
          select: { id: true },
        },
        logicalDatabases: { include: { components: true } },
        hostAsset: { select: { id: true, name: true, assetId: true } },
        hostVm: { select: { id: true, name: true, systemName: true } },
        createdByUser: true,
        documentLinks: {
          include: {
            document: { select: { id: true, title: true, updatedAt: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return databases.map((database) =>
      this.toListItem(database as unknown as DatabaseWithAccounts),
    );
  }

  async getDataQualitySummary() {
    const databases = await this.prisma.databaseInventory.findMany({
      where: { status: { not: DatabaseStatus.ARCHIVED } },
      select: {
        id: true,
        name: true,
        engine: true,
        host: true,
        ipAddress: true,
        owner: true,
        environment: true,
        backupPolicy: true,
        accounts: { select: { id: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const issues = databases.flatMap((database) => {
      const missing = [
        !database.owner && 'owner',
        !database.environment && 'environment',
        !database.backupPolicy && 'backup policy',
        database.accounts.length === 0 && 'database account',
      ].filter(Boolean) as string[];
      return missing.length
        ? [
            {
              id: database.id,
              name: database.name,
              engine: database.engine,
              issues: missing,
            },
          ]
        : [];
    });
    return {
      totalDatabases: databases.length,
      completeDatabases: databases.length - issues.length,
      issueCount: issues.length,
      issues,
    };
  }

  async findOne(id: string) {
    const database = await this.prisma.databaseInventory.findUnique({
      where: { id },
      include: {
        accounts: {
          include: { logicalDatabases: { select: { id: true, name: true } } },
        },
        logicalDatabases: { include: { components: true } },
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

  async update(
    id: string,
    updateDatabaseDto: UpdateDatabaseDto,
    userId: string,
  ) {
    await this.findOne(id);
    await this.validateLogicalDatabaseScopes(id, updateDatabaseDto.accounts);

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
          ? { environment: this.sanitizeText(updateDatabaseDto.environment) }
          : {}),
        ...(updateDatabaseDto.host !== undefined
          ? { host: updateDatabaseDto.host.trim() }
          : {}),
        ...(updateDatabaseDto.ipAddress !== undefined
          ? { ipAddress: updateDatabaseDto.ipAddress.trim() }
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
          ? {
              status: updateDatabaseDto.status
                ? (this.sanitizeText(
                    updateDatabaseDto.status,
                  ) as DatabaseStatus)
                : null,
            }
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
        ...(updateDatabaseDto.hostAssetId !== undefined
          ? { hostAssetId: this.sanitizeText(updateDatabaseDto.hostAssetId) }
          : {}),
        ...(updateDatabaseDto.hostVmId !== undefined
          ? { hostVmId: this.sanitizeText(updateDatabaseDto.hostVmId) }
          : {}),
        ...(updateDatabaseDto.accounts !== undefined
          ? {
              accounts: {
                deleteMany: {},
                create: this.buildAccounts(updateDatabaseDto.accounts).map(
                  (account, index) => ({
                    ...account,
                    ...(updateDatabaseDto.accounts?.[index]?.logicalDatabaseIds
                      ?.length
                      ? {
                          logicalDatabases: {
                            connect: updateDatabaseDto.accounts[
                              index
                            ].logicalDatabaseIds.map((id) => ({ id })),
                          },
                        }
                      : {}),
                  }),
                ),
              },
            }
          : {}),
      },
      include: {
        accounts: {
          include: { logicalDatabases: { select: { id: true, name: true } } },
        },
        logicalDatabases: { include: { components: true } },
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

    return this.toDetail(updated);
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
      include: { components: true },
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
      include: { components: true },
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
    await this.prisma.logicalDatabase.delete({ where: { id: logicalId } });
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.UPDATE_DATABASE,
        targetId: id,
        details: JSON.stringify({
          logicalDatabase: existing.name,
          deleted: true,
        }),
      },
    });
    return { id: logicalId, deleted: true };
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
