import { PrismaService } from '../prisma/prisma.service';
export declare class DashboardService {
    private prisma;
    constructor(prisma: PrismaService);
    getOverview(): Promise<{
        totalAssets: number;
        activeAssets: number;
        riskLevel: string;
        riskFactors: {
            eolAssets: number;
            outdatedPatches: number;
            oldCredentials: number;
        };
    }>;
}
