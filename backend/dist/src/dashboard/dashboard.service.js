"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let DashboardService = class DashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOverview() {
        const [totalAssets, activeAssets, assetTypeGroups, totalDatabases, productionDatabases, totalDatabaseAccounts, totalUsers, totalSources, healthySources, connectionFailedSources, readyToSyncSources, pendingVmSetup, activeVmInventory, orphanedVmInventory, latestVmSync, adminUsers,] = await Promise.all([
            this.prisma.asset.count(),
            this.prisma.asset.count({
                where: { status: client_1.AssetStatus.ACTIVE },
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
                        in: [client_1.VmDiscoveryState.NEEDS_CONTEXT, client_1.VmDiscoveryState.READY_TO_PROMOTE],
                    },
                },
            }),
            this.prisma.vmInventory.count({
                where: {
                    lifecycleState: client_1.VmLifecycleState.ACTIVE,
                    syncState: {
                        not: 'Missing from source',
                    },
                },
            }),
            this.prisma.vmInventory.count({
                where: {
                    OR: [
                        { syncState: 'Missing from source' },
                        { lifecycleState: client_1.VmLifecycleState.DELETED_IN_VCENTER },
                    ],
                },
            }),
            this.prisma.vmVCenterSource.aggregate({
                _max: {
                    lastSyncAt: true,
                },
            }),
            this.prisma.user.count({
                where: { role: client_1.Role.ADMIN },
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
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map