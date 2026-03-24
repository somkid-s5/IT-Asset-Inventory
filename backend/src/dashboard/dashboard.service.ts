import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssetStatus, VmDiscoveryState, VmLifecycleState, Role } from '@prisma/client';

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaService) { }

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
            this.prisma.user.count(),
            this.prisma.vmVCenterSource.count(),
            this.prisma.vmVCenterSource.count({
                where: { status: 'Healthy' },
            }),
            this.prisma.vmVCenterSource.count({
                where: { status: 'Connection failed' },
            }),
            this.prisma.vmVCenterSource.count({
                where: { status: 'Ready to sync' },
            }),
            this.prisma.vmDiscovery.count({
                where: {
                    state: {
                        in: [VmDiscoveryState.NEEDS_CONTEXT, VmDiscoveryState.READY_TO_PROMOTE],
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
                where: { role: Role.ADMIN },
            }),
        ]);

        const assetBreakdown = assetTypeGroups.map((group) => ({
            label: group.type,
            count: group._count._all,
        }));

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
        };
    }
}
