"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../prisma/prisma.service");
const avatar_seed_1 = require("../auth/avatar-seed");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        const users = await this.prisma.user.findMany({
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarSeed: true,
                avatarImage: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return users;
    }
    async create(createUserDto, actorUserId) {
        const existingUser = await this.prisma.user.findUnique({
            where: { username: createUserDto.username },
        });
        if (existingUser) {
            throw new common_1.ConflictException('Username already exists');
        }
        const passwordHash = await bcrypt.hash(createUserDto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                username: createUserDto.username,
                displayName: createUserDto.displayName,
                avatarSeed: (0, avatar_seed_1.createAvatarSeed)(),
                email: null,
                passwordHash,
                role: createUserDto.role,
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarSeed: true,
                avatarImage: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        await this.prisma.auditLog.create({
            data: {
                userId: actorUserId,
                action: client_1.AuditAction.CREATE_USER,
                targetId: user.id,
                details: JSON.stringify({
                    username: user.username,
                    displayName: user.displayName,
                    role: user.role,
                    source: 'admin-create',
                }),
            },
        });
        return user;
    }
    async updateRole(userId, role, currentUserId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                role: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.id === currentUserId && role !== client_1.Role.ADMIN) {
            throw new common_1.BadRequestException('You cannot remove your own admin role');
        }
        if (user.role === client_1.Role.ADMIN && role !== client_1.Role.ADMIN) {
            const adminCount = await this.prisma.user.count({
                where: { role: client_1.Role.ADMIN },
            });
            if (adminCount <= 1) {
                throw new common_1.BadRequestException('At least one admin account must remain');
            }
        }
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: { role },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarSeed: true,
                avatarImage: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        await this.prisma.auditLog.create({
            data: {
                userId: currentUserId,
                action: client_1.AuditAction.UPDATE_USER_ROLE,
                targetId: userId,
                details: JSON.stringify({
                    role,
                }),
            },
        });
        return updatedUser;
    }
    async remove(userId, currentUserId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                role: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.id === currentUserId) {
            throw new common_1.BadRequestException('You cannot delete your own account');
        }
        if (user.role === client_1.Role.ADMIN) {
            const adminCount = await this.prisma.user.count({
                where: { role: client_1.Role.ADMIN },
            });
            if (adminCount <= 1) {
                throw new common_1.BadRequestException('At least one admin account must remain');
            }
        }
        await this.prisma.user.delete({
            where: { id: userId },
        });
        return { success: true };
    }
    async resetPassword(userId, password, actorUserId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true, displayName: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const passwordHash = await bcrypt.hash(password, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash },
        });
        if (actorUserId) {
            await this.prisma.auditLog.create({
                data: {
                    userId: actorUserId,
                    action: client_1.AuditAction.RESET_USER_PASSWORD,
                    targetId: userId,
                    details: JSON.stringify({
                        username: user.username,
                        displayName: user.displayName,
                    }),
                },
            });
        }
        return { success: true };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map