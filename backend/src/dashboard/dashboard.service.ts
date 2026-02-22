import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssetStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaService) { }

    async getOverview() {
        const totalAssets = await this.prisma.asset.count();
        const activeAssets = await this.prisma.asset.count({
            where: { status: AssetStatus.ACTIVE },
        });

        // Compute basic risk score
        // 1. Find assets with expired EOL
        const now = new Date();
        const eolAssets = await this.prisma.asset.count({
            where: {
                patchInfo: {
                    is: {
                        eolDate: {
                            lt: now,
                        },
                    },
                },
            },
        });

        // 2. Find assets not patched in > 6 months (180 days)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setDate(now.getDate() - 180);

        const outdatedPatches = await this.prisma.asset.count({
            where: {
                patchInfo: {
                    is: {
                        lastPatchedDate: {
                            lt: sixMonthsAgo,
                        },
                    },
                },
            },
        });

        // 3. Find credentials older than 90 days
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(now.getDate() - 90);

        const oldCredentials = await this.prisma.credential.count({
            where: {
                lastChangedDate: {
                    lt: ninetyDaysAgo,
                },
            },
        });

        // Calculate a naive risk score
        let riskLevel = 'LOW';
        if (eolAssets > 0) {
            riskLevel = 'CRITICAL';
        } else if (outdatedPatches > 0) {
            riskLevel = 'HIGH';
        } else if (oldCredentials > 0) {
            riskLevel = 'MEDIUM';
        }

        return {
            totalAssets,
            activeAssets,
            riskLevel,
            riskFactors: {
                eolAssets,
                outdatedPatches,
                oldCredentials,
            }
        };
    }
}
