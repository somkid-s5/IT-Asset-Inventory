import { Injectable } from '@nestjs/common';
import {
  AssetStatus,
  Role,
  VmDiscoveryState,
  VmLifecycleState,
  VmSourceStatus,
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
    ] = await Promise.all([
      this.prisma.asset.count(),
      this.prisma.asset.count({ where: { status: AssetStatus.ACTIVE } }),
      this.prisma.asset.groupBy({ by: ['type'], _count: { _all: true } }),
      this.prisma.databaseInventory.count(),
      this.prisma.databaseInventory.count({ where: { environment: 'PROD' } }),
      this.prisma.databaseAccount.count(),
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
        },
      }),
      this.prisma.vmVCenterSource.aggregate({ _max: { lastSyncAt: true } }),
      this.prisma.user.count({ where: { role: Role.ADMIN, deletedAt: null } }),
      this.prisma.patchInfo.count({ where: { eolDate: { lt: new Date() } } }),
    ]);

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
      users: {
        total: totalUsers,
        admins: adminUsers,
        nonAdmins: Math.max(0, totalUsers - adminUsers),
      },
    };
  }
}
