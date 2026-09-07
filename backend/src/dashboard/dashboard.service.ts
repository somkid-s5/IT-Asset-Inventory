import { Injectable } from '@nestjs/common';
import {
  AssetStatus,
  Role,
  VmDiscoveryState,
  VmLifecycleState,
  VmSourceStatus,
  ApplicationStatus,
  DatabaseStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const [
      totalAssets,
      activeAssets,
      assetTypeGroups,
      totalDatabases,
      productionDatabases,
      totalDatabaseAccounts,
      totalUsers,
      totalSources,
      healthySources,
      connectionFailedSources,
      readyToSyncSources,
      pendingVmSetup,
      activeVmInventory,
      orphanedVmInventory,
      latestVmSync,
      adminUsers,
      eolAssets,
      totalApplications,
      activeApplications,
    ] = await Promise.all([
      this.prisma.asset.count({
        where: { status: { not: AssetStatus.ARCHIVED } },
      }),
      this.prisma.asset.count({ where: { status: AssetStatus.ACTIVE } }),
      this.prisma.asset.groupBy({
        by: ['type'],
        where: { status: { not: AssetStatus.ARCHIVED } },
        _count: { _all: true },
      }),
      this.prisma.databaseInventory.count({
        where: { status: { not: DatabaseStatus.ARCHIVED } },
      }),
      this.prisma.databaseInventory.count({
        where: {
          environment: 'PROD',
          status: { not: DatabaseStatus.ARCHIVED },
        },
      }),
      this.prisma.databaseAccount.count({
        where: {
          databaseInventory: { status: { not: DatabaseStatus.ARCHIVED } },
        },
      }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.vmVCenterSource.count(),
      this.prisma.vmVCenterSource.count({
        where: { status: VmSourceStatus.HEALTHY },
      }),
      this.prisma.vmVCenterSource.count({
        where: { status: VmSourceStatus.CONNECTION_FAILED },
      }),
      this.prisma.vmVCenterSource.count({
        where: { status: VmSourceStatus.READY_TO_SYNC },
      }),
      this.prisma.vmDiscovery.count({
        where: {
          state: {
            in: [
              VmDiscoveryState.NEEDS_CONTEXT,
              VmDiscoveryState.READY_TO_PROMOTE,
            ],
          },
        },
      }),
      this.prisma.vmInventory.count({
        where: {
          lifecycleState: VmLifecycleState.ACTIVE,
          syncState: { not: 'Missing from source' },
        },
      }),
      this.prisma.vmInventory.count({
        where: {
          OR: [
            { syncState: 'Missing from source' },
            { lifecycleState: VmLifecycleState.DELETED_IN_VCENTER },
          ],
          NOT: { lifecycleState: VmLifecycleState.ARCHIVED },
        },
      }),
      this.prisma.vmVCenterSource.aggregate({ _max: { lastSyncAt: true } }),
      this.prisma.user.count({ where: { role: Role.ADMIN, deletedAt: null } }),
      this.prisma.patchInfo.count({ where: { eolDate: { lt: new Date() } } }),
      this.prisma.application.count(),
      this.prisma.application.count({
        where: { status: ApplicationStatus.ACTIVE },
      }),
    ]);

    const [recentApplications, recentAssets, recentVms, recentDatabases] =
      await Promise.all([
        this.prisma.application.findMany({
          where: { status: ApplicationStatus.ACTIVE },
          select: { id: true, name: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
          take: 5,
        }),
        this.prisma.asset.findMany({
          where: { status: { not: AssetStatus.ARCHIVED } },
          select: { id: true, name: true, assetId: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
          take: 5,
        }),
        this.prisma.vmInventory.findMany({
          where: { lifecycleState: { not: VmLifecycleState.ARCHIVED } },
          select: { id: true, name: true, systemName: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
          take: 5,
        }),
        this.prisma.databaseInventory.findMany({
          where: { status: { not: DatabaseStatus.ARCHIVED } },
          select: { id: true, name: true, engine: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
          take: 5,
        }),
      ]);

    const recentlyUpdated = [
      ...recentApplications.map((record) => ({
        id: record.id,
        kind: 'application' as const,
        name: record.name,
        metadata: 'Application',
        updatedAt: record.updatedAt,
        href: `/dashboard/applications/${record.id}`,
      })),
      ...recentAssets.map((record) => ({
        id: record.id,
        kind: 'asset' as const,
        name: record.name,
        metadata: record.assetId ?? 'Asset',
        updatedAt: record.updatedAt,
        href: `/dashboard/assets/${record.id}`,
      })),
      ...recentVms.map((record) => ({
        id: record.id,
        kind: 'vm' as const,
        name: record.name,
        metadata: record.systemName ?? 'Virtual Machine',
        updatedAt: record.updatedAt,
        href: `/dashboard/virtual-machines/${record.id}`,
      })),
      ...recentDatabases.map((record) => ({
        id: record.id,
        kind: 'database' as const,
        name: record.name,
        metadata: record.engine,
        updatedAt: record.updatedAt,
        href: `/dashboard/databases/${record.id}`,
      })),
    ]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 8);

    return {
      assets: {
        total: totalAssets,
        active: activeAssets,
        nonActive: Math.max(0, totalAssets - activeAssets),
        breakdown: assetTypeGroups.map((group) => ({
          label: group.type,
          count: group._count._all,
        })),
        eolCount: eolAssets,
      },
      vm: {
        sources: totalSources,
        healthySources,
        connectionFailedSources,
        readyToSyncSources,
        pendingSetup: pendingVmSetup,
        activeInventory: activeVmInventory,
        orphaned: orphanedVmInventory,
        latestSyncAt: latestVmSync._max.lastSyncAt,
      },
      databases: {
        total: totalDatabases,
        production: productionDatabases,
        accounts: totalDatabaseAccounts,
      },
      applications: {
        total: totalApplications,
        active: activeApplications,
        archived: Math.max(0, totalApplications - activeApplications),
      },
      recentlyUpdated,
      users: {
        total: totalUsers,
        admins: adminUsers,
        nonAdmins: Math.max(0, totalUsers - adminUsers),
      },
    };
  }
}
