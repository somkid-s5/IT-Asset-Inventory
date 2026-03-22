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
exports.DatabasesService = void 0;
const common_1 = require("@nestjs/common");
const credentials_service_1 = require("../credentials/credentials.service");
const prisma_service_1 = require("../prisma/prisma.service");
let DatabasesService = class DatabasesService {
    prisma;
    credentialsService;
    constructor(prisma, credentialsService) {
        this.prisma = prisma;
        this.credentialsService = credentialsService;
    }
    sanitizeText(value) {
        return value?.trim() || null;
    }
    buildAccounts(accounts) {
        return (accounts ?? [])
            .filter((account) => account.username.trim())
            .map((account) => ({
            username: account.username.trim(),
            role: this.sanitizeText(account.role),
            encryptedPassword: this.credentialsService.encrypt(account.password ?? ''),
            privileges: (account.privileges ?? []).map((privilege) => privilege.trim()).filter(Boolean),
            note: this.sanitizeText(account.note),
        }));
    }
    toListItem(database) {
        return {
            id: database.id,
            name: database.name,
            engine: database.engine,
            version: database.version,
            environment: database.environment,
            host: database.host,
            ipAddress: database.ipAddress,
            port: database.port,
            serviceName: database.serviceName,
            owner: database.owner,
            backupPolicy: database.backupPolicy,
            replication: database.replication,
            linkedApps: database.linkedApps,
            maintenanceWindow: database.maintenanceWindow,
            status: database.status,
            note: database.note,
            accountsCount: database.accounts.length,
            createdAt: database.createdAt,
            updatedAt: database.updatedAt,
        };
    }
    toDetail(database) {
        return {
            ...this.toListItem(database),
            accounts: database.accounts.map((account) => ({
                id: account.id,
                username: account.username,
                role: account.role,
                password: this.credentialsService.decrypt(account.encryptedPassword),
                privileges: account.privileges,
                note: account.note,
                createdAt: account.createdAt,
                updatedAt: account.updatedAt,
            })),
        };
    }
    async create(createDatabaseDto, userId) {
        const created = await this.prisma.databaseInventory.create({
            data: {
                name: createDatabaseDto.name.trim(),
                engine: createDatabaseDto.engine.trim(),
                version: this.sanitizeText(createDatabaseDto.version),
                environment: this.sanitizeText(createDatabaseDto.environment),
                host: createDatabaseDto.host.trim(),
                ipAddress: createDatabaseDto.ipAddress.trim(),
                port: this.sanitizeText(createDatabaseDto.port),
                serviceName: this.sanitizeText(createDatabaseDto.serviceName),
                owner: this.sanitizeText(createDatabaseDto.owner),
                backupPolicy: this.sanitizeText(createDatabaseDto.backupPolicy),
                replication: this.sanitizeText(createDatabaseDto.replication),
                linkedApps: (createDatabaseDto.linkedApps ?? []).map((app) => app.trim()).filter(Boolean),
                maintenanceWindow: this.sanitizeText(createDatabaseDto.maintenanceWindow),
                status: this.sanitizeText(createDatabaseDto.status),
                note: this.sanitizeText(createDatabaseDto.note),
                createdByUserId: userId,
                accounts: {
                    create: this.buildAccounts(createDatabaseDto.accounts),
                },
            },
            include: {
                accounts: true,
                createdByUser: true,
            },
        });
        return this.toDetail(created);
    }
    async findAll() {
        const databases = await this.prisma.databaseInventory.findMany({
            include: {
                accounts: true,
                createdByUser: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return databases.map((database) => this.toListItem(database));
    }
    async findOne(id) {
        const database = await this.prisma.databaseInventory.findUnique({
            where: { id },
            include: {
                accounts: true,
                createdByUser: true,
            },
        });
        if (!database) {
            throw new common_1.NotFoundException(`Database ${id} not found`);
        }
        return this.toDetail(database);
    }
    async update(id, updateDatabaseDto) {
        await this.findOne(id);
        const updated = await this.prisma.databaseInventory.update({
            where: { id },
            data: {
                ...(updateDatabaseDto.name !== undefined ? { name: updateDatabaseDto.name.trim() } : {}),
                ...(updateDatabaseDto.engine !== undefined ? { engine: updateDatabaseDto.engine.trim() } : {}),
                ...(updateDatabaseDto.version !== undefined ? { version: this.sanitizeText(updateDatabaseDto.version) } : {}),
                ...(updateDatabaseDto.environment !== undefined ? { environment: this.sanitizeText(updateDatabaseDto.environment) } : {}),
                ...(updateDatabaseDto.host !== undefined ? { host: updateDatabaseDto.host.trim() } : {}),
                ...(updateDatabaseDto.ipAddress !== undefined ? { ipAddress: updateDatabaseDto.ipAddress.trim() } : {}),
                ...(updateDatabaseDto.port !== undefined ? { port: this.sanitizeText(updateDatabaseDto.port) } : {}),
                ...(updateDatabaseDto.serviceName !== undefined ? { serviceName: this.sanitizeText(updateDatabaseDto.serviceName) } : {}),
                ...(updateDatabaseDto.owner !== undefined ? { owner: this.sanitizeText(updateDatabaseDto.owner) } : {}),
                ...(updateDatabaseDto.backupPolicy !== undefined ? { backupPolicy: this.sanitizeText(updateDatabaseDto.backupPolicy) } : {}),
                ...(updateDatabaseDto.replication !== undefined ? { replication: this.sanitizeText(updateDatabaseDto.replication) } : {}),
                ...(updateDatabaseDto.linkedApps !== undefined
                    ? { linkedApps: updateDatabaseDto.linkedApps.map((app) => app.trim()).filter(Boolean) }
                    : {}),
                ...(updateDatabaseDto.maintenanceWindow !== undefined
                    ? { maintenanceWindow: this.sanitizeText(updateDatabaseDto.maintenanceWindow) }
                    : {}),
                ...(updateDatabaseDto.status !== undefined ? { status: this.sanitizeText(updateDatabaseDto.status) } : {}),
                ...(updateDatabaseDto.note !== undefined ? { note: this.sanitizeText(updateDatabaseDto.note) } : {}),
                ...(updateDatabaseDto.accounts !== undefined
                    ? {
                        accounts: {
                            deleteMany: {},
                            create: this.buildAccounts(updateDatabaseDto.accounts),
                        },
                    }
                    : {}),
            },
            include: {
                accounts: true,
                createdByUser: true,
            },
        });
        return this.toDetail(updated);
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.databaseInventory.delete({ where: { id } });
    }
};
exports.DatabasesService = DatabasesService;
exports.DatabasesService = DatabasesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        credentials_service_1.CredentialsService])
], DatabasesService);
//# sourceMappingURL=databases.service.js.map