import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDatabaseDto } from './dto/create-database.dto';
import { UpdateDatabaseDto } from './dto/update-database.dto';

type DatabaseWithAccounts = Prisma.DatabaseInventoryGetPayload<{
  include: {
    accounts: true;
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

  private buildAccounts(accounts: CreateDatabaseDto['accounts'] | UpdateDatabaseDto['accounts']) {
    return (accounts ?? [])
      .filter((account) => account.username.trim())
      .map((account) => ({
        username: account.username.trim(),
        role: this.sanitizeText(account.role),
        encryptedPassword: this.credentialsService.encrypt(account.password ?? ''),
        privileges: (account.privileges ?? []).map((privilege) => privilege.trim()).filter(Boolean),
        note: this.sanitizeText(account.note),
      }));
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
      accountsCount: database.accounts.length,
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
        password: this.credentialsService.decrypt(account.encryptedPassword),
        privileges: account.privileges,
        note: account.note,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      })),
    };
  }

  async create(createDatabaseDto: CreateDatabaseDto, userId: string) {
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
        linkedApps: (createDatabaseDto.linkedApps ?? []).map((app) => app.trim()).filter(Boolean),
        maintenanceWindow: this.sanitizeText(createDatabaseDto.maintenanceWindow),
        status: this.sanitizeText(createDatabaseDto.status),
        note: this.sanitizeText(createDatabaseDto.note),
        createdByUserId: userId,
        accounts: {
          create: this.buildAccounts(createDatabaseDto.accounts),
        },
      },
      include: {
        accounts: true,
        createdByUser: true,
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

  async findAll() {
    const databases = await this.prisma.databaseInventory.findMany({
      take: 1000,
      include: {
        accounts: {
          select: { id: true }
        },
        createdByUser: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return databases.map((database) => this.toListItem(database as any));
  }

  async findOne(id: string) {
    const database = await this.prisma.databaseInventory.findUnique({
      where: { id },
      include: {
        accounts: true,
        createdByUser: true,
      },
    });

    if (!database) {
      throw new NotFoundException(`Database ${id} not found`);
    }

    return this.toDetail(database);
  }

  async update(id: string, updateDatabaseDto: UpdateDatabaseDto, userId: string) {
    await this.findOne(id);

    const updated = await this.prisma.databaseInventory.update({
      where: { id },
      data: {
        ...(updateDatabaseDto.name !== undefined ? { name: updateDatabaseDto.name.trim() } : {}),
        ...(updateDatabaseDto.engine !== undefined ? { engine: updateDatabaseDto.engine.trim() } : {}),
        ...(updateDatabaseDto.version !== undefined ? { version: this.sanitizeText(updateDatabaseDto.version) } : {}),
        ...(updateDatabaseDto.environment !== undefined ? { environment: this.sanitizeText(updateDatabaseDto.environment) } : {}),
        ...(updateDatabaseDto.host !== undefined ? { host: updateDatabaseDto.host.trim() } : {}),
        ...(updateDatabaseDto.ipAddress !== undefined ? { ipAddress: updateDatabaseDto.ipAddress.trim() } : {}),
        ...(updateDatabaseDto.port !== undefined ? { port: this.sanitizeText(updateDatabaseDto.port) } : {}),
        ...(updateDatabaseDto.serviceName !== undefined ? { serviceName: this.sanitizeText(updateDatabaseDto.serviceName) } : {}),
        ...(updateDatabaseDto.owner !== undefined ? { owner: this.sanitizeText(updateDatabaseDto.owner) } : {}),
        ...(updateDatabaseDto.backupPolicy !== undefined ? { backupPolicy: this.sanitizeText(updateDatabaseDto.backupPolicy) } : {}),
        ...(updateDatabaseDto.replication !== undefined ? { replication: this.sanitizeText(updateDatabaseDto.replication) } : {}),
        ...(updateDatabaseDto.linkedApps !== undefined
          ? { linkedApps: updateDatabaseDto.linkedApps.map((app) => app.trim()).filter(Boolean) }
          : {}),
        ...(updateDatabaseDto.maintenanceWindow !== undefined
          ? { maintenanceWindow: this.sanitizeText(updateDatabaseDto.maintenanceWindow) }
          : {}),
        ...(updateDatabaseDto.status !== undefined ? { status: this.sanitizeText(updateDatabaseDto.status) } : {}),
        ...(updateDatabaseDto.note !== undefined ? { note: this.sanitizeText(updateDatabaseDto.note) } : {}),
        ...(updateDatabaseDto.accounts !== undefined
          ? {
              accounts: {
                deleteMany: {},
                create: this.buildAccounts(updateDatabaseDto.accounts),
              },
            }
          : {}),
      },
      include: {
        accounts: true,
        createdByUser: true,
      },
    });

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
    const deleted = await this.prisma.databaseInventory.delete({ where: { id } });

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

    return deleted;
  }
}
