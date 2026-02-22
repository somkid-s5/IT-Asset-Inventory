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
exports.CredentialsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto = __importStar(require("crypto"));
let CredentialsService = class CredentialsService {
    prisma;
    algorithm = 'aes-256-gcm';
    secretKey = process.env.ENCRYPTION_KEY || '12345678123456781234567812345678';
    constructor(prisma) {
        this.prisma = prisma;
    }
    encrypt(text) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(this.secretKey), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        return `${iv.toString('hex')}:${encrypted}:${authTag}`;
    }
    decrypt(text) {
        const [ivHex, encryptedHex, authTagHex] = text.split(':');
        const decipher = crypto.createDecipheriv(this.algorithm, Buffer.from(this.secretKey), Buffer.from(ivHex, 'hex'));
        decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    async create(createCredentialDto) {
        const { password, ...rest } = createCredentialDto;
        const encryptedPassword = this.encrypt(password);
        return this.prisma.credential.create({
            data: {
                ...rest,
                encryptedPassword,
            },
        });
    }
    async findByAsset(assetId) {
        return this.prisma.credential.findMany({
            where: { assetId },
            select: {
                id: true,
                assetId: true,
                username: true,
                lastChangedDate: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }
    async revealPassword(id, userId) {
        const credential = await this.prisma.credential.findUnique({
            where: { id },
        });
        if (!credential) {
            throw new common_1.NotFoundException(`Credential ${id} not found`);
        }
        await this.prisma.auditLog.create({
            data: {
                userId,
                action: 'VIEW_PASSWORD',
                targetId: id,
                details: `Revealed password for ${credential.username} on asset ${credential.assetId}`,
            },
        });
        return {
            password: this.decrypt(credential.encryptedPassword),
        };
    }
    async update(id, updateCredentialDto) {
        const { password, ...rest } = updateCredentialDto;
        let dataToUpdate = { ...rest };
        if (password) {
            dataToUpdate.encryptedPassword = this.encrypt(password);
            dataToUpdate.lastChangedDate = new Date();
        }
        return this.prisma.credential.update({
            where: { id },
            data: dataToUpdate,
        });
    }
    async remove(id) {
        return this.prisma.credential.delete({
            where: { id },
        });
    }
};
exports.CredentialsService = CredentialsService;
exports.CredentialsService = CredentialsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CredentialsService);
//# sourceMappingURL=credentials.service.js.map