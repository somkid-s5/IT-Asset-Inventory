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
exports.AssetsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const credentials_service_1 = require("../credentials/credentials.service");
let AssetsService = class AssetsService {
    prisma;
    credentialsService;
    constructor(prisma, credentialsService) {
        this.prisma = prisma;
        this.credentialsService = credentialsService;
    }
    buildCreateRelations(dto) {
        return {
            ...(dto.ips !== undefined
                ? {
                    ipAllocations: {
                        create: (dto.ips ?? []).map((ip) => ({
                            address: ip.address.trim(),
                            type: ip.type?.trim() || null,
                            nodeLabel: ip.nodeLabel?.trim() || null,
                            manageType: ip.manageType?.trim() || null,
                            version: ip.version?.trim() || null,
                        })),
                    },
                }
                : {}),
            ...(dto.credentials !== undefined
                ? {
                    credentials: {
                        create: (dto.credentials ?? [])
                            .filter((credential) => credential.username.trim())
                            .map((credential) => ({
                            username: credential.username.trim(),
                            type: credential.type?.trim() || null,
                            nodeLabel: credential.nodeLabel?.trim() || null,
                            manageType: credential.manageType?.trim() || null,
                            version: credential.version?.trim() || null,
                            encryptedPassword: this.credentialsService.encrypt(credential.password ?? ''),
                        })),
                    },
                }
                : {}),
        };
    }
    buildReplaceRelations(dto) {
        return {
            ...(dto.ips !== undefined
                ? {
                    ipAllocations: {
                        deleteMany: {},
                        create: (dto.ips ?? []).map((ip) => ({
                            address: ip.address.trim(),
                            type: ip.type?.trim() || null,
                            nodeLabel: ip.nodeLabel?.trim() || null,
                            manageType: ip.manageType?.trim() || null,
                            version: ip.version?.trim() || null,
                        })),
                    },
                }
                : {}),
            ...(dto.credentials !== undefined
                ? {
                    credentials: {
                        deleteMany: {},
                        create: (dto.credentials ?? [])
                            .filter((credential) => credential.username.trim())
                            .map((credential) => ({
                            username: credential.username.trim(),
                            type: credential.type?.trim() || null,
                            nodeLabel: credential.nodeLabel?.trim() || null,
                            manageType: credential.manageType?.trim() || null,
                            version: credential.version?.trim() || null,
                            encryptedPassword: this.credentialsService.encrypt(credential.password ?? ''),
                        })),
                    },
                }
                : {}),
        };
    }
    toListItem(asset) {
        return {
            ...asset,
            credentials: asset.credentials.map((credential) => ({
                id: credential.id,
                username: credential.username,
                type: credential.type,
                lastChangedDate: credential.lastChangedDate,
            })),
        };
    }
    toDetail(asset) {
        return {
            ...asset,
            credentials: asset.credentials.map((credential) => ({
                ...credential,
                password: this.credentialsService.decrypt(credential.encryptedPassword),
            })),
        };
    }
    async create(createAssetDto, userId) {
        const { ips: _ips, credentials: _credentials, ...assetData } = createAssetDto;
        const created = await this.prisma.asset.create({
            data: {
                ...assetData,
                status: createAssetDto.status || client_1.AssetStatus.ACTIVE,
                createdByUserId: userId,
                ...this.buildCreateRelations(createAssetDto),
            },
            include: {
                patchInfo: true,
                ipAllocations: true,
                parent: true,
                children: true,
                credentials: true,
            },
        });
        return this.toDetail(created);
    }
    async findAll() {
        const assets = await this.prisma.asset.findMany({
            include: {
                patchInfo: true,
                ipAllocations: true,
                parent: true,
                children: true,
                credentials: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return assets.map((asset) => this.toListItem(asset));
    }
    async findOne(id) {
        const asset = await this.prisma.asset.findUnique({
            where: { id },
            include: {
                patchInfo: true,
                ipAllocations: true,
                parent: true,
                children: true,
                credentials: true,
            },
        });
        if (!asset) {
            throw new common_1.NotFoundException(`Asset with ID ${id} not found`);
        }
        return this.toDetail(asset);
    }
    async update(id, updateAssetDto) {
        await this.findOne(id);
        const { ips, credentials, ...assetData } = updateAssetDto;
        const updated = await this.prisma.$transaction(async (tx) => {
            return tx.asset.update({
                where: { id },
                data: {
                    ...assetData,
                    ...(updateAssetDto.customMetadata !== undefined
                        ? { customMetadata: updateAssetDto.customMetadata }
                        : {}),
                    ...(ips !== undefined || credentials !== undefined
                        ? this.buildReplaceRelations({
                            ...updateAssetDto,
                            ips: updateAssetDto.ips ?? [],
                            credentials: updateAssetDto.credentials ?? [],
                        })
                        : {}),
                },
                include: {
                    patchInfo: true,
                    ipAllocations: true,
                    parent: true,
                    children: true,
                    credentials: true,
                },
            });
        });
        return this.toDetail(updated);
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.asset.delete({
            where: { id },
        });
    }
};
exports.AssetsService = AssetsService;
exports.AssetsService = AssetsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        credentials_service_1.CredentialsService])
], AssetsService);
//# sourceMappingURL=assets.service.js.map