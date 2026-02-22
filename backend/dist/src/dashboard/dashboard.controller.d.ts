import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
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
