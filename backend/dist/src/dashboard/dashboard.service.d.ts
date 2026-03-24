import { PrismaService } from '../prisma/prisma.service';
export declare class DashboardService {
    private prisma;
    constructor(prisma: PrismaService);
    getOverview(): Promise<{
        assets: {
            total: number;
            active: number;
            inactive: number;
            breakdown: {
                label: import(".prisma/client").$Enums.AssetType;
                count: number;
            }[];
        };
        vm: {
            sources: number;
            healthySources: number;
            connectionFailedSources: number;
            readyToSyncSources: number;
            pendingSetup: number;
            activeInventory: number;
            orphaned: number;
            latestSyncAt: Date | null;
        };
        databases: {
            total: number;
            production: number;
            accounts: number;
        };
        users: {
            total: number;
            admins: number;
            nonAdmins: number;
        };
    }>;
}
