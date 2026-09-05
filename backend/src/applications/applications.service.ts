import { Injectable, NotFoundException } from '@nestjs/common';
import { ApplicationStatus, AuditAction, Prisma, Role } from '@prisma/client';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ComponentDto, EnvironmentDto } from './dto/topology.dto';
import { evaluateApplicationCompleteness } from './completeness';

const include = {
  environments: {
    include: {
      components: {
        include: {
          assetLinks: {
            include: {
              asset: { select: { id: true, name: true, assetId: true } },
            },
          },
          vmLinks: {
            include: {
              vm: { select: { id: true, name: true, systemName: true } },
            },
          },
          logicalDatabases: { select: { id: true, name: true } },
        },
        orderBy: { sortOrder: 'asc' as const },
      },
      access: true,
    },
    orderBy: { sortOrder: 'asc' as const },
  },
  access: {
    include: { credentials: true, environment: true },
    orderBy: { createdAt: 'asc' as const },
  },
  createdByUser: { select: { id: true, displayName: true, username: true } },
} satisfies Prisma.ApplicationInclude;
type ApplicationWithRelations = Prisma.ApplicationGetPayload<{
  include: typeof include;
}>;

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentials: CredentialsService,
  ) {}

  private text(value?: string | null) {
    return value?.trim() || null;
  }
  private project(app: ApplicationWithRelations, role: Role = Role.VIEWER) {
    const canViewSensitive = role === Role.ADMIN || role === Role.EDITOR;
    const completeness = evaluateApplicationCompleteness({
      name: app.name,
      description: app.description,
      technicalOwner: app.technicalOwner,
      businessUnit: app.businessUnit,
      environments: app.environments.map((environment) => ({
        name: environment.name,
        noDatabase: environment.noDatabase,
        components: environment.components.map((component) => ({
          assetCount: component.assetLinks.length,
          vmCount: component.vmLinks.length,
          logicalDatabaseCount: component.logicalDatabases.length,
        })),
      })),
    });
    return {
      id: app.id,
      name: app.name,
      technicalOwner: app.technicalOwner,
      businessUnit: app.businessUnit,
      description: app.description,
      status: app.status,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      completeness,
      createdByUser: app.createdByUser,
      environments: app.environments.map((env) => ({
        ...env,
        components: env.components.map((component) => ({
          ...component,
          assets: component.assetLinks.map((link) => ({
            ...link.asset,
            relationType: link.relationType,
            responsibleParty: link.responsibleParty,
          })),
          virtualMachines: component.vmLinks.map((link) => ({
            ...link.vm,
            relationType: link.relationType,
            responsibleParty: link.responsibleParty,
          })),
          logicalDatabases: component.logicalDatabases,
        })),
      })),
      access: app.access.map((item) => ({
        ...item,
        address: canViewSensitive ? item.address : '[restricted]',
        credentials: item.credentials.map((c) => ({
          id: c.id,
          username: c.username,
          role: c.role,
          hasPassword: Boolean(c.encryptedPassword),
          lastChangedDate: c.lastChangedDate,
        })),
      })),
    };
  }

  private nested(dto: CreateApplicationDto | UpdateApplicationDto) {
    const environments = dto.environments?.map((env, index) => ({
      name: env.name,
      noDatabase: Boolean(env.noDatabase),
      sortOrder: index,
      components: {
        create: (env.components ?? [])
          .filter((c) => c.name.trim())
          .map((c, componentIndex) => ({
            name: c.name.trim(),
            description: this.text(c.description),
            sortOrder: componentIndex,
            ...(c.assetIds?.length
              ? {
                  assetLinks: {
                    create: c.assetIds.map((assetId) => ({
                      asset: { connect: { id: assetId } },
                    })),
                  },
                }
              : {}),
            ...(c.vmIds?.length
              ? {
                  vmLinks: {
                    create: c.vmIds.map((vmId) => ({
                      vm: { connect: { id: vmId } },
                    })),
                  },
                }
              : {}),
            ...(c.logicalDatabaseIds?.length
              ? {
                  logicalDatabases: {
                    connect: c.logicalDatabaseIds.map((id) => ({ id })),
                  },
                }
              : {}),
          })),
      },
      access: {
        create: this.buildAccess(env.access),
      },
    }));
    const access = dto.access?.map((item) => this.buildAccess([item])[0]);
    return { environments, access };
  }

  private buildAccess(
    items?: Array<{
      label: string;
      address: string;
      method: string;
      environmentId?: string;
      credentials?: Array<{
        username: string;
        password: string;
        role?: string;
      }>;
    }>,
  ) {
    return (items ?? []).map((item) => ({
      label: item.label.trim(),
      address: item.address.trim(),
      method: item.method.trim(),
      ...(item.environmentId
        ? { environment: { connect: { id: item.environmentId } } }
        : {}),
      credentials: {
        create: (item.credentials ?? [])
          .filter((c) => c.username.trim())
          .map((c) => ({
            username: c.username.trim(),
            encryptedPassword: this.credentials.encrypt(c.password ?? ''),
            role: this.text(c.role),
          })),
      },
    }));
  }

  async findAll(includeArchived = false, q?: string, role: Role = Role.VIEWER) {
    const where: Prisma.ApplicationWhereInput = {
      ...(includeArchived ? {} : { status: ApplicationStatus.ACTIVE }),
      ...(q?.trim()
        ? {
            OR: [
              { name: { contains: q.trim(), mode: 'insensitive' } },
              { technicalOwner: { contains: q.trim(), mode: 'insensitive' } },
              { businessUnit: { contains: q.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const apps = await this.prisma.application.findMany({
      where,
      include,
      orderBy: { name: 'asc' },
    });
    return apps.map((app) => this.project(app, role));
  }

  async findOne(id: string, role: Role = Role.VIEWER) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include,
    });
    if (!app) throw new NotFoundException(`Application ${id} not found`);
    return this.project(app, role);
  }

  async getDataQualitySummary() {
    const applications = await this.prisma.application.findMany({
      where: { status: ApplicationStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        description: true,
        technicalOwner: true,
        businessUnit: true,
        environments: {
          select: {
            name: true,
            noDatabase: true,
            components: {
              select: {
                assetLinks: { select: { id: true } },
                vmLinks: { select: { id: true } },
                logicalDatabases: { select: { id: true } },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const issues = applications.flatMap((app) => {
      const completeness = evaluateApplicationCompleteness({
        name: app.name,
        description: app.description,
        technicalOwner: app.technicalOwner,
        businessUnit: app.businessUnit,
        environments: app.environments.map((environment) => ({
          name: environment.name,
          noDatabase: environment.noDatabase,
          components: environment.components.map((component) => ({
            assetCount: component.assetLinks.length,
            vmCount: component.vmLinks.length,
            logicalDatabaseCount: component.logicalDatabases.length,
          })),
        })),
      });
      return completeness.missingFields.length
        ? [{ id: app.id, name: app.name, issues: completeness.missingFields }]
        : [];
    });
    return {
      totalApplications: applications.length,
      completeApplications: applications.length - issues.length,
      issueCount: issues.length,
      issues,
    };
  }

  async create(dto: CreateApplicationDto, userId: string) {
    const nested = this.nested(dto);
    const app = await this.prisma.application.create({
      data: {
        name: dto.name.trim(),
        technicalOwner: this.text(dto.technicalOwner),
        businessUnit: this.text(dto.businessUnit),
        description: this.text(dto.description),
        createdByUserId: userId,
        ...(nested.environments
          ? { environments: { create: nested.environments } }
          : {}),
        ...(nested.access ? { access: { create: nested.access } } : {}),
      },
      include,
    });
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.CREATE_APPLICATION,
        targetId: app.id,
        details: JSON.stringify({ name: app.name }),
      },
    });
    return this.project(app);
  }

  async update(id: string, dto: UpdateApplicationDto, userId: string) {
    await this.findOne(id);
    const nested = this.nested(dto);
    const app = await this.prisma.application.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.technicalOwner !== undefined
          ? { technicalOwner: this.text(dto.technicalOwner) }
          : {}),
        ...(dto.businessUnit !== undefined
          ? { businessUnit: this.text(dto.businessUnit) }
          : {}),
        ...(dto.description !== undefined
          ? { description: this.text(dto.description) }
          : {}),
        ...(nested.environments
          ? { environments: { deleteMany: {}, create: nested.environments } }
          : {}),
        ...(nested.access
          ? { access: { deleteMany: {}, create: nested.access } }
          : {}),
      },
      include,
    });
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.UPDATE_APPLICATION,
        targetId: id,
        details: JSON.stringify({ name: app.name }),
      },
    });
    return this.project(app);
  }

  async archive(id: string, userId: string) {
    return this.setStatus(
      id,
      ApplicationStatus.ARCHIVED,
      userId,
      AuditAction.ARCHIVE_APPLICATION,
    );
  }

  async createEnvironment(
    applicationId: string,
    dto: EnvironmentDto,
    userId: string,
  ) {
    await this.findOne(applicationId);
    const environment = await this.prisma.applicationEnvironment.create({
      data: {
        applicationId,
        name: dto.name,
        noDatabase: Boolean(dto.noDatabase),
        sortOrder: await this.prisma.applicationEnvironment.count({
          where: { applicationId },
        }),
      },
    });
    await this.recordTopologyAudit(userId, applicationId, {
      environment: environment.name,
      action: 'create',
    });
    return this.findOne(applicationId);
  }

  async updateEnvironment(
    applicationId: string,
    environmentId: string,
    dto: EnvironmentDto,
    userId: string,
  ) {
    const environment = await this.prisma.applicationEnvironment.findFirst({
      where: { id: environmentId, applicationId },
    });
    if (!environment)
      throw new NotFoundException('Application environment not found');
    await this.prisma.applicationEnvironment.update({
      where: { id: environmentId },
      data: { name: dto.name, noDatabase: Boolean(dto.noDatabase) },
    });
    await this.recordTopologyAudit(userId, applicationId, {
      environment: dto.name,
      action: 'update',
    });
    return this.findOne(applicationId);
  }

  async deleteEnvironment(
    applicationId: string,
    environmentId: string,
    userId: string,
  ) {
    const environment = await this.prisma.applicationEnvironment.findFirst({
      where: { id: environmentId, applicationId },
    });
    if (!environment)
      throw new NotFoundException('Application environment not found');
    await this.prisma.applicationEnvironment.delete({
      where: { id: environmentId },
    });
    await this.recordTopologyAudit(userId, applicationId, {
      environment: environment.name,
      action: 'delete',
    });
    return this.findOne(applicationId);
  }

  async createComponent(
    applicationId: string,
    environmentId: string,
    dto: ComponentDto,
    userId: string,
  ) {
    const environment = await this.prisma.applicationEnvironment.findFirst({
      where: { id: environmentId, applicationId },
    });
    if (!environment)
      throw new NotFoundException('Application environment not found');
    await this.prisma.applicationComponent.create({
      data: {
        environmentId,
        name: dto.name.trim(),
        description: this.text(dto.description),
        sortOrder: await this.prisma.applicationComponent.count({
          where: { environmentId },
        }),
        ...(dto.assetIds?.length
          ? {
              assetLinks: {
                create: dto.assetIds.map((assetId) => ({ assetId })),
              },
            }
          : {}),
        ...(dto.vmIds?.length
          ? { vmLinks: { create: dto.vmIds.map((vmId) => ({ vmId })) } }
          : {}),
        ...(dto.logicalDatabaseIds?.length
          ? {
              logicalDatabases: {
                connect: dto.logicalDatabaseIds.map((id) => ({ id })),
              },
            }
          : {}),
      },
    });
    await this.recordTopologyAudit(userId, applicationId, {
      component: dto.name.trim(),
      action: 'create',
    });
    return this.findOne(applicationId);
  }

  async updateComponent(
    applicationId: string,
    environmentId: string,
    componentId: string,
    dto: ComponentDto,
    userId: string,
  ) {
    const component = await this.prisma.applicationComponent.findFirst({
      where: { id: componentId, environmentId, environment: { applicationId } },
    });
    if (!component)
      throw new NotFoundException('Application component not found');
    await this.prisma.applicationComponent.update({
      where: { id: componentId },
      data: {
        name: dto.name.trim(),
        description: this.text(dto.description),
        ...(dto.assetIds
          ? {
              assetLinks: {
                deleteMany: {},
                create: dto.assetIds.map((assetId) => ({ assetId })),
              },
            }
          : {}),
        ...(dto.vmIds
          ? {
              vmLinks: {
                deleteMany: {},
                create: dto.vmIds.map((vmId) => ({ vmId })),
              },
            }
          : {}),
        ...(dto.logicalDatabaseIds
          ? {
              logicalDatabases: {
                set: dto.logicalDatabaseIds.map((id) => ({ id })),
              },
            }
          : {}),
      },
    });
    await this.recordTopologyAudit(userId, applicationId, {
      component: dto.name.trim(),
      action: 'update',
    });
    return this.findOne(applicationId);
  }

  async deleteComponent(
    applicationId: string,
    environmentId: string,
    componentId: string,
    userId: string,
  ) {
    const component = await this.prisma.applicationComponent.findFirst({
      where: { id: componentId, environmentId, environment: { applicationId } },
    });
    if (!component)
      throw new NotFoundException('Application component not found');
    await this.prisma.applicationComponent.delete({
      where: { id: componentId },
    });
    await this.recordTopologyAudit(userId, applicationId, {
      component: component.name,
      action: 'delete',
    });
    return this.findOne(applicationId);
  }

  private recordTopologyAudit(
    userId: string,
    applicationId: string,
    details: Record<string, string>,
  ) {
    return this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.UPDATE_APPLICATION,
        targetId: applicationId,
        details: JSON.stringify(details),
      },
    });
  }
  async restore(id: string, userId: string) {
    return this.setStatus(
      id,
      ApplicationStatus.ACTIVE,
      userId,
      AuditAction.RESTORE_APPLICATION,
    );
  }

  private async setStatus(
    id: string,
    status: ApplicationStatus,
    userId: string,
    action: AuditAction,
  ) {
    const app = await this.prisma.application.update({
      where: { id },
      data: { status },
      include,
    });
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        targetId: id,
        details: JSON.stringify({ name: app.name, status }),
      },
    });
    return this.project(app);
  }

  async revealCredential(id: string, credentialId: string, userId: string) {
    const credential = await this.prisma.applicationCredential.findFirst({
      where: { id: credentialId, access: { applicationId: id } },
      include: { access: true },
    });
    if (!credential)
      throw new NotFoundException('Application credential not found');
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.VIEW_APPLICATION_PASSWORD,
        targetId: credential.id,
        details: JSON.stringify({
          applicationId: id,
          username: credential.username,
        }),
      },
    });
    return { password: this.credentials.decrypt(credential.encryptedPassword) };
  }
}
