import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, Prisma } from '@prisma/client';

const MAX_PAGE_SIZE = 100;

const DESTRUCTIVE_ACTIONS = Object.values(AuditAction).filter((action) =>
  action.startsWith('DELETE_'),
) as AuditAction[];

const SORTABLE_FIELDS = ['timestamp', 'action', 'ipAddress'] as const;
type SortableField = (typeof SORTABLE_FIELDS)[number];

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  actorId?: string;
  from?: string;
  to?: string;
  sortBy?: string;
  sortDir?: string;
}

function normalizePage(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(Math.floor(value as number), 1) : 1;
}

function normalizeLimit(value: number | undefined) {
  return Number.isFinite(value)
    ? Math.min(Math.max(Math.floor(value as number), 1), MAX_PAGE_SIZE)
    : MAX_PAGE_SIZE;
}

function parseDate(value: string | undefined, label: string, endOfDay = false) {
  if (!value?.trim()) return undefined;

  const normalized = value.trim();
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(normalized)
      ? `${normalized}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`
      : normalized,
  );
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${label} must be a valid date`);
  }
  return date;
}

function safeAction(value: string | undefined) {
  if (!value?.trim()) return undefined;
  const action = value.trim().toUpperCase();
  if (!Object.values(AuditAction).includes(action as AuditAction)) {
    throw new BadRequestException('action must be a supported audit action');
  }
  return action as AuditAction;
}

function redactDetailsValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactDetailsValue);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      /password|secret|token|encrypted/i.test(key)
        ? '[REDACTED]'
        : redactDetailsValue(nestedValue),
    ]),
  );
}

export function redactAuditDetails(details: string | null) {
  if (!details) return details;
  try {
    return JSON.stringify(redactDetailsValue(JSON.parse(details)));
  } catch {
    return details.replace(
      /((?:password|secret|token|encryptedPassword)\s*[:=]\s*)("[^"]*"|[^,\s}]+)/gi,
      '$1[REDACTED]',
    );
  }
}

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: AuditLogQuery = {}) {
    try {
      const page = normalizePage(query.page);
      const limit = normalizeLimit(query.limit);
      const skip = (page - 1) * limit;
      const search = query.search?.trim();
      const action = safeAction(query.action);
      const from = parseDate(query.from, 'from');
      const to = parseDate(query.to, 'to', true);
      if (from && to && from > to) {
        throw new BadRequestException(
          'from must be earlier than or equal to to',
        );
      }

      const searchAction = Object.values(AuditAction).includes(
        search?.toUpperCase() as AuditAction,
      )
        ? (search?.toUpperCase() as AuditAction)
        : undefined;
      const searchConditions: Prisma.AuditLogWhereInput[] = search
        ? [
            ...(searchAction ? [{ action: { equals: searchAction } }] : []),
            { details: { contains: search, mode: 'insensitive' } },
            { ipAddress: { contains: search, mode: 'insensitive' } },
            {
              user: {
                is: {
                  OR: [
                    { username: { contains: search, mode: 'insensitive' } },
                    { displayName: { contains: search, mode: 'insensitive' } },
                  ],
                },
              },
            },
          ]
        : [];
      const where: Prisma.AuditLogWhereInput = {
        ...(searchConditions.length ? { OR: searchConditions } : {}),
        ...(action ? { action } : {}),
        ...(query.actorId?.trim() ? { userId: query.actorId.trim() } : {}),
        ...(from || to
          ? {
              timestamp: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      };

      const sortBy = SORTABLE_FIELDS.includes(query.sortBy as SortableField)
        ? (query.sortBy as SortableField)
        : 'timestamp';
      const sortDir = query.sortDir === 'asc' ? 'asc' : 'desc';
      const orderBy = [
        { [sortBy]: sortDir },
        { id: 'desc' as const },
      ] as Prisma.AuditLogOrderByWithRelationInput[];
      const scopedWhere = (extra: Prisma.AuditLogWhereInput) => ({
        AND: [where, extra],
      });

      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      const [data, total, todayEvents, deleteEvents, actorRows] =
        await Promise.all([
          this.prisma.auditLog.findMany({
            orderBy,
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarSeed: true,
                  avatarImage: true,
                },
              },
            },
            where,
            skip,
            take: limit,
          }),
          this.prisma.auditLog.count({ where }),
          this.prisma.auditLog.count({
            where: scopedWhere({
              timestamp: { gte: todayStart, lte: todayEnd },
            }),
          }),
          this.prisma.auditLog.count({
            where: scopedWhere({ action: { in: DESTRUCTIVE_ACTIONS } }),
          }),
          this.prisma.auditLog.findMany({
            where,
            select: { userId: true },
            distinct: ['userId'],
          }),
        ]);

      return {
        data: data.map((record) => ({
          ...record,
          details: redactAuditDetails(record.details),
        })),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        summary: {
          totalEvents: total,
          todayEvents,
          deleteEvents,
          uniqueActors: actorRows.length,
          scope: 'all events matching the current filters',
        },
      };
    } catch (error) {
      console.error('AuditLogsService.findAll Error:', error);
      throw error;
    }
  }

  async recordExport(
    userId: string,
    details: { resource: string; count: number; query?: string },
  ) {
    return this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.EXPORT_DATA,
        details: JSON.stringify(details),
      },
    });
  }
}
