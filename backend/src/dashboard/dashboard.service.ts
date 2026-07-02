import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AssetStatus,
  VmDiscoveryState,
  VmLifecycleState,
  Role,
  VmSourceStatus,
} from '@prisma/client';

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
    ] = await Promise.all([
      this.prisma.asset.count(),
      this.prisma.asset.count({
        where: { status: AssetStatus.ACTIVE },
      }),
      this.prisma.asset.groupBy({
        by: ['type'],
        _count: {
          _all: true,
        },
      }),
      this.prisma.databaseInventory.count(),
      this.prisma.databaseInventory.count({
        where: { environment: 'PROD' },
      }),
      this.prisma.databaseAccount.count(),
      this.prisma.user.count({
        where: { deletedAt: null },
      }),
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
          syncState: {
            not: 'Missing from source',
          },
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
      this.prisma.vmVCenterSource.aggregate({
        _max: {
          lastSyncAt: true,
        },
      }),
      this.prisma.user.count({
        where: { role: Role.ADMIN, deletedAt: null },
      }),
    ]);

    const assetBreakdown = assetTypeGroups.map((group) => ({
      label: group.type,
      count: group._count._all,
    }));

    const [
      totalTicketsCount,
      openTicketsCount,
      resolvedTicketsCount,
      metSlaCountRaw,
      breachedResolvedCountRaw,
      breachedOpenCountRaw,
    ] = await Promise.all([
      this.prisma.ticket.count(),
      this.prisma.ticket.count({
        where: { status: { notIn: ['RESOLVED', 'CLOSED'] } },
      }),
      this.prisma.ticket.count({
        where: { status: { in: ['RESOLVED', 'CLOSED'] } },
      }),
      this.prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int as count 
        FROM "Ticket" 
        WHERE ("status" = 'RESOLVED' OR "status" = 'CLOSED')
          AND "resolvedAt" <= "createdAt" + (
            CASE "priority"::text
              WHEN 'CRITICAL' THEN 4
              WHEN 'HIGH' THEN 12
              WHEN 'MEDIUM' THEN 24
              WHEN 'LOW' THEN 72
              ELSE 24
            END * interval '1 hour'
          )
      `,
      this.prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int as count 
        FROM "Ticket" 
        WHERE ("status" = 'RESOLVED' OR "status" = 'CLOSED')
          AND "resolvedAt" > "createdAt" + (
            CASE "priority"::text
              WHEN 'CRITICAL' THEN 4
              WHEN 'HIGH' THEN 12
              WHEN 'MEDIUM' THEN 24
              WHEN 'LOW' THEN 72
              ELSE 24
            END * interval '1 hour'
          )
      `,
      this.prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int as count 
        FROM "Ticket" 
        WHERE "status" NOT IN ('RESOLVED', 'CLOSED')
          AND NOW() > "createdAt" + (
            CASE "priority"::text
              WHEN 'CRITICAL' THEN 4
              WHEN 'HIGH' THEN 12
              WHEN 'MEDIUM' THEN 24
              WHEN 'LOW' THEN 72
              ELSE 24
            END * interval '1 hour'
          )
      `,
    ]);

    const metSlaCount = Number(metSlaCountRaw[0]?.count || 0);
    const breachedResolvedCount = Number(
      breachedResolvedCountRaw[0]?.count || 0,
    );
    const breachedOpenCount = Number(breachedOpenCountRaw[0]?.count || 0);
    const breachedCount = breachedResolvedCount + breachedOpenCount;
    const openCount = openTicketsCount;

    const slaSuccessRate =
      resolvedTicketsCount > 0
        ? Math.round((metSlaCount / resolvedTicketsCount) * 100)
        : 100;

    // Asset Health Score Calculation
    let healthScore = 100;

    if (totalAssets > 0) {
      const offlineRatio = (totalAssets - activeAssets) / totalAssets;
      healthScore -= Math.round(offlineRatio * 30);
    }

    if (totalSources > 0) {
      const failedRatio = connectionFailedSources / totalSources;
      healthScore -= Math.round(failedRatio * 40);
    }

    const eolAssetsCount = await this.prisma.patchInfo.count({
      where: {
        eolDate: {
          lt: new Date(),
        },
      },
    });

    if (totalAssets > 0) {
      const eolRatio = eolAssetsCount / totalAssets;
      healthScore -= Math.round(eolRatio * 30);
    }

    const assetHealthScore = Math.max(0, Math.min(100, healthScore));

    return {
      assets: {
        total: totalAssets,
        active: activeAssets,
        inactive: Math.max(0, totalAssets - activeAssets),
        breakdown: assetBreakdown,
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
      tickets: {
        total: totalTicketsCount,
        open: openCount,
        resolved: resolvedTicketsCount,
        metSla: metSlaCount,
        breached: breachedCount,
        slaSuccessRate,
      },
      assetHealth: {
        score: assetHealthScore,
        eolCount: eolAssetsCount,
      },
    };
  }
}
