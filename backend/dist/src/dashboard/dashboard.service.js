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
        const totalAssets = await this.prisma.asset.count();
        const activeAssets = await this.prisma.asset.count({
            where: { status: client_1.AssetStatus.ACTIVE },
        });
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
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(now.getDate() - 90);
        const oldCredentials = await this.prisma.credential.count({
            where: {
                lastChangedDate: {
                    lt: ninetyDaysAgo,
                },
            },
        });
        let riskLevel = 'LOW';
        if (eolAssets > 0) {
            riskLevel = 'CRITICAL';
        }
        else if (outdatedPatches > 0) {
            riskLevel = 'HIGH';
        }
        else if (oldCredentials > 0) {
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
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map