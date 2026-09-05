import { Injectable, NotFoundException } from '@nestjs/common';
import { ApplicationStatus, AuditAction, Prisma } from '@prisma/client';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

const include = {
  environments: {
    include: { components: { orderBy: { sortOrder: 'asc' as const } } },
    orderBy: { sortOrder: 'asc' as const },
  },
  access: {
    include: { credentials: true },
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
  private project(app: ApplicationWithRelations) {
    return {
      id: app.id,
      name: app.name,
      technicalOwner: app.technicalOwner,
      businessUnit: app.businessUnit,
      description: app.description,
      status: app.status,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      createdByUser: app.createdByUser,
      environments: app.environments.map((env) => ({
        ...env,
        components: env.components,
      })),
      access: app.access.map((item) => ({
        ...item,
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
          })),
      },
    }));
    const access = dto.access?.map((item) => ({
      label: item.label.trim(),
      address: item.address.trim(),
      method: item.method.trim(),
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
    return { environments, access };
  }

  async findAll(includeArchived = false, q?: string) {
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
    return apps.map((app) => this.project(app));
  }

  async findOne(id: string) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include,
    });
    if (!app) throw new NotFoundException(`Application ${id} not found`);
    return this.project(app);
  }

  async getDataQualitySummary() {
    const applications = await this.prisma.application.findMany({
      where: { status: ApplicationStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        technicalOwner: true,
        businessUnit: true,
        environments: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const issues = applications.flatMap((app) => {
      const missing = [
        !app.technicalOwner && 'technical owner',
        !app.businessUnit && 'business unit',
        !app.environments.some((env) => env.name === 'PROD') &&
          'PROD environment',
      ].filter(Boolean) as string[];
      return missing.length
        ? [{ id: app.id, name: app.name, issues: missing }]
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
