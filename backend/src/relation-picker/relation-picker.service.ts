import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ApplicationStatus,
  AssetStatus,
  DatabaseStatus,
  Prisma,
  VmLifecycleState,
} from '@prisma/client';
import {
  RelationPickerLifecycleFilter,
  RelationPickerQueryDto,
  RelationPickerResourceKind,
} from './dto/relation-picker-query.dto';
import { PrismaService } from '../prisma/prisma.service';

export interface RelationPickerItem {
  id: string;
  label: string;
  metadata: string | null;
  lifecycle: string;
  archived: boolean;
}

export interface RelationPickerResult {
  kind: RelationPickerResourceKind;
  items: RelationPickerItem[];
  selectedItems: RelationPickerItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  nextCursor: string | null;
}

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

@Injectable()
export class RelationPickerService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: RelationPickerQueryDto): Promise<RelationPickerResult> {
    const pageSize = Math.min(
      Math.max(query.pageSize ?? DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE,
    );
    const page = this.resolvePage(query);
    const selectedIds = [...new Set(query.selectedIds ?? [])];
    const searchText = query.q?.trim() ?? '';
    const lifecycle = query.lifecycle ?? RelationPickerLifecycleFilter.ELIGIBLE;

    switch (query.kind) {
      case RelationPickerResourceKind.APPLICATIONS:
        return this.searchApplications(
          query,
          searchText,
          lifecycle,
          selectedIds,
          page,
          pageSize,
        );
      case RelationPickerResourceKind.ASSETS:
        return this.searchAssets(
          query,
          searchText,
          lifecycle,
          selectedIds,
          page,
          pageSize,
        );
      case RelationPickerResourceKind.VMS:
        return this.searchVms(
          query,
          searchText,
          lifecycle,
          selectedIds,
          page,
          pageSize,
        );
      case RelationPickerResourceKind.DATABASES:
        return this.searchDatabases(
          query,
          searchText,
          lifecycle,
          selectedIds,
          page,
          pageSize,
        );
      case RelationPickerResourceKind.LOGICAL_DATABASES:
        return this.searchLogicalDatabases(
          query,
          searchText,
          lifecycle,
          selectedIds,
          page,
          pageSize,
        );
    }
  }

  private resolvePage(query: RelationPickerQueryDto) {
    if (!query.cursor) return Math.max(query.page ?? 1, 1);

    const decoded = Buffer.from(query.cursor, 'base64url').toString('utf8');
    const page = Number(decoded);
    if (!Number.isInteger(page) || page < 1) {
      throw new BadRequestException(
        'cursor must be a valid relation picker cursor',
      );
    }
    return page;
  }

  private cursorFor(page: number, hasMore: boolean) {
    return hasMore
      ? Buffer.from(String(page + 1), 'utf8').toString('base64url')
      : null;
  }

  private result(
    kind: RelationPickerResourceKind,
    items: RelationPickerItem[],
    selectedItems: RelationPickerItem[],
    total: number,
    page: number,
    pageSize: number,
  ): RelationPickerResult {
    const hasMore = page * pageSize < total;
    const itemIds = new Set(items.map((item) => item.id));
    return {
      kind,
      items,
      selectedItems: selectedItems.filter((item) => !itemIds.has(item.id)),
      total,
      page,
      pageSize,
      hasMore,
      nextCursor: this.cursorFor(page, hasMore),
    };
  }

  private lifecycleWhere<T extends Record<string, unknown>>(
    filter: RelationPickerLifecycleFilter,
    field: string,
  ): T {
    if (filter === RelationPickerLifecycleFilter.ALL) return {} as T;
    if (filter === RelationPickerLifecycleFilter.ARCHIVED) {
      return { [field]: 'ARCHIVED' } as T;
    }
    return { [field]: { not: 'ARCHIVED' } } as T;
  }

  private async searchApplications(
    query: RelationPickerQueryDto,
    searchText: string,
    lifecycle: RelationPickerLifecycleFilter,
    selectedIds: string[],
    page: number,
    pageSize: number,
  ) {
    const search: Prisma.ApplicationWhereInput = searchText
      ? {
          OR: [
            { name: { contains: searchText, mode: 'insensitive' } },
            { technicalOwner: { contains: searchText, mode: 'insensitive' } },
            { businessUnit: { contains: searchText, mode: 'insensitive' } },
          ],
        }
      : {};
    const where: Prisma.ApplicationWhereInput = {
      ...this.lifecycleWhere(lifecycle, 'status'),
      ...(query.environment
        ? { environments: { some: { name: query.environment as never } } }
        : {}),
      ...search,
    };
    const select = {
      id: true,
      name: true,
      status: true,
    } satisfies Prisma.ApplicationSelect;
    const [rows, total, selected] = await Promise.all([
      this.prisma.application.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select,
      }),
      this.prisma.application.count({ where }),
      selectedIds.length
        ? this.prisma.application.findMany({
            where: { id: { in: selectedIds } },
            orderBy: { name: 'asc' },
            select,
          })
        : Promise.resolve([]),
    ]);

    return this.result(
      RelationPickerResourceKind.APPLICATIONS,
      rows.map((row) => this.applicationItem(row)),
      selected.map((row) => this.applicationItem(row)),
      total,
      page,
      pageSize,
    );
  }

  private applicationItem(row: {
    id: string;
    name: string;
    status: ApplicationStatus;
  }): RelationPickerItem {
    return {
      id: row.id,
      label: row.name,
      metadata: row.status,
      lifecycle: row.status,
      archived: row.status === ApplicationStatus.ARCHIVED,
    };
  }

  private async searchAssets(
    query: RelationPickerQueryDto,
    searchText: string,
    lifecycle: RelationPickerLifecycleFilter,
    selectedIds: string[],
    page: number,
    pageSize: number,
  ) {
    const search: Prisma.AssetWhereInput = searchText
      ? {
          OR: [
            { name: { contains: searchText, mode: 'insensitive' } },
            { assetId: { contains: searchText, mode: 'insensitive' } },
            { sn: { contains: searchText, mode: 'insensitive' } },
            { location: { contains: searchText, mode: 'insensitive' } },
          ],
        }
      : {};
    const where: Prisma.AssetWhereInput = {
      ...this.lifecycleWhere(lifecycle, 'status'),
      ...(query.environment ? { environment: query.environment } : {}),
      ...search,
    };
    const select = {
      id: true,
      name: true,
      assetId: true,
      type: true,
      environment: true,
      status: true,
    } satisfies Prisma.AssetSelect;
    const [rows, total, selected] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select,
      }),
      this.prisma.asset.count({ where }),
      selectedIds.length
        ? this.prisma.asset.findMany({
            where: { id: { in: selectedIds } },
            orderBy: { name: 'asc' },
            select,
          })
        : Promise.resolve([]),
    ]);

    return this.result(
      RelationPickerResourceKind.ASSETS,
      rows.map((row) => this.assetItem(row)),
      selected.map((row) => this.assetItem(row)),
      total,
      page,
      pageSize,
    );
  }

  private assetItem(row: {
    id: string;
    name: string;
    assetId: string | null;
    type: string;
    environment: string | null;
    status: AssetStatus;
  }): RelationPickerItem {
    return {
      id: row.id,
      label: row.name,
      metadata:
        [row.assetId, row.type, row.environment].filter(Boolean).join(' · ') ||
        null,
      lifecycle: row.status,
      archived: row.status === AssetStatus.ARCHIVED,
    };
  }

  private async searchVms(
    query: RelationPickerQueryDto,
    searchText: string,
    lifecycle: RelationPickerLifecycleFilter,
    selectedIds: string[],
    page: number,
    pageSize: number,
  ) {
    const search: Prisma.VmInventoryWhereInput = searchText
      ? {
          OR: [
            { name: { contains: searchText, mode: 'insensitive' } },
            { systemName: { contains: searchText, mode: 'insensitive' } },
            { primaryIp: { contains: searchText, mode: 'insensitive' } },
          ],
        }
      : {};
    const where: Prisma.VmInventoryWhereInput = {
      ...this.lifecycleWhere(lifecycle, 'lifecycleState'),
      ...(query.environment ? { environment: query.environment as never } : {}),
      ...search,
    };
    const select = {
      id: true,
      name: true,
      systemName: true,
      primaryIp: true,
      environment: true,
      lifecycleState: true,
    } satisfies Prisma.VmInventorySelect;
    const [rows, total, selected] = await Promise.all([
      this.prisma.vmInventory.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ systemName: 'asc' }, { id: 'asc' }],
        select,
      }),
      this.prisma.vmInventory.count({ where }),
      selectedIds.length
        ? this.prisma.vmInventory.findMany({
            where: { id: { in: selectedIds } },
            orderBy: { systemName: 'asc' },
            select,
          })
        : Promise.resolve([]),
    ]);

    return this.result(
      RelationPickerResourceKind.VMS,
      rows.map((row) => this.vmItem(row)),
      selected.map((row) => this.vmItem(row)),
      total,
      page,
      pageSize,
    );
  }

  private vmItem(row: {
    id: string;
    name: string;
    systemName: string;
    primaryIp: string;
    environment: string | null;
    lifecycleState: VmLifecycleState;
  }): RelationPickerItem {
    return {
      id: row.id,
      label: row.systemName || row.name,
      metadata:
        [
          row.name !== row.systemName ? row.name : null,
          row.primaryIp,
          row.environment,
        ]
          .filter(Boolean)
          .join(' · ') || null,
      lifecycle: row.lifecycleState,
      archived: row.lifecycleState === VmLifecycleState.ARCHIVED,
    };
  }

  private async searchDatabases(
    query: RelationPickerQueryDto,
    searchText: string,
    lifecycle: RelationPickerLifecycleFilter,
    selectedIds: string[],
    page: number,
    pageSize: number,
  ) {
    const search: Prisma.DatabaseInventoryWhereInput = searchText
      ? {
          OR: [
            { name: { contains: searchText, mode: 'insensitive' } },
            { engine: { contains: searchText, mode: 'insensitive' } },
            { environment: { contains: searchText, mode: 'insensitive' } },
            { ipAddress: { contains: searchText, mode: 'insensitive' } },
          ],
        }
      : {};
    const where: Prisma.DatabaseInventoryWhereInput = {
      ...this.lifecycleWhere(lifecycle, 'status'),
      ...(query.environment ? { environment: query.environment } : {}),
      ...search,
    };
    const select = {
      id: true,
      name: true,
      engine: true,
      environment: true,
      status: true,
    } satisfies Prisma.DatabaseInventorySelect;
    const [rows, total, selected] = await Promise.all([
      this.prisma.databaseInventory.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select,
      }),
      this.prisma.databaseInventory.count({ where }),
      selectedIds.length
        ? this.prisma.databaseInventory.findMany({
            where: { id: { in: selectedIds } },
            orderBy: { name: 'asc' },
            select,
          })
        : Promise.resolve([]),
    ]);

    return this.result(
      RelationPickerResourceKind.DATABASES,
      rows.map((row) => this.databaseItem(row)),
      selected.map((row) => this.databaseItem(row)),
      total,
      page,
      pageSize,
    );
  }

  private databaseItem(row: {
    id: string;
    name: string;
    engine: string;
    environment: string | null;
    status: DatabaseStatus | null;
  }): RelationPickerItem {
    const lifecycle = row.status ?? 'UNKNOWN';
    return {
      id: row.id,
      label: row.name,
      metadata:
        [row.engine, row.environment].filter(Boolean).join(' · ') || null,
      lifecycle,
      archived: row.status === DatabaseStatus.ARCHIVED,
    };
  }

  private async searchLogicalDatabases(
    query: RelationPickerQueryDto,
    searchText: string,
    lifecycle: RelationPickerLifecycleFilter,
    selectedIds: string[],
    page: number,
    pageSize: number,
  ) {
    const whereAnd: Prisma.LogicalDatabaseWhereInput[] = [];
    if (lifecycle === RelationPickerLifecycleFilter.ARCHIVED) {
      whereAnd.push({
        OR: [
          { status: DatabaseStatus.ARCHIVED },
          { databaseInventory: { status: DatabaseStatus.ARCHIVED } },
        ],
      });
    } else if (lifecycle === RelationPickerLifecycleFilter.ELIGIBLE) {
      whereAnd.push({ status: { not: DatabaseStatus.ARCHIVED } });
      whereAnd.push({
        databaseInventory: { status: { not: DatabaseStatus.ARCHIVED } },
      });
    }
    if (query.environment) {
      whereAnd.push({ databaseInventory: { environment: query.environment } });
    }
    if (searchText) {
      whereAnd.push({
        OR: [
          { name: { contains: searchText, mode: 'insensitive' } },
          {
            databaseInventory: {
              name: { contains: searchText, mode: 'insensitive' },
            },
          },
        ],
      });
    }
    const where: Prisma.LogicalDatabaseWhereInput = whereAnd.length
      ? { AND: whereAnd }
      : {};
    const select = {
      id: true,
      name: true,
      status: true,
      databaseInventory: {
        select: { id: true, name: true, environment: true, status: true },
      },
    } satisfies Prisma.LogicalDatabaseSelect;
    const [rows, total, selected] = await Promise.all([
      this.prisma.logicalDatabase.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [
          { databaseInventory: { name: 'asc' } },
          { name: 'asc' },
          { id: 'asc' },
        ],
        select,
      }),
      this.prisma.logicalDatabase.count({ where }),
      selectedIds.length
        ? this.prisma.logicalDatabase.findMany({
            where: { id: { in: selectedIds } },
            orderBy: [{ databaseInventory: { name: 'asc' } }, { name: 'asc' }],
            select,
          })
        : Promise.resolve([]),
    ]);

    return this.result(
      RelationPickerResourceKind.LOGICAL_DATABASES,
      rows.map((row) => this.logicalDatabaseItem(row)),
      selected.map((row) => this.logicalDatabaseItem(row)),
      total,
      page,
      pageSize,
    );
  }

  private logicalDatabaseItem(row: {
    id: string;
    name: string;
    status: DatabaseStatus;
    databaseInventory: {
      id: string;
      name: string;
      environment: string | null;
      status: DatabaseStatus | null;
    };
  }): RelationPickerItem {
    const archived =
      row.status === DatabaseStatus.ARCHIVED ||
      row.databaseInventory.status === DatabaseStatus.ARCHIVED;
    return {
      id: row.id,
      label: `${row.databaseInventory.name} · ${row.name}`,
      metadata:
        [row.databaseInventory.environment, row.status]
          .filter(Boolean)
          .join(' · ') || null,
      lifecycle: archived ? DatabaseStatus.ARCHIVED : row.status,
      archived,
    };
  }
}
