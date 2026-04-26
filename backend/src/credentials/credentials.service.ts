import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';
import * as crypto from 'crypto';

@Injectable()
export class CredentialsService {
    private readonly algorithm = 'aes-256-gcm';
    // Enforce standardized hex-based key via ENV variable, remove hardcoded fallback for security.
    private readonly secretKey = (process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY) as string;

    constructor(private prisma: PrismaService) {
        if (!this.secretKey || Buffer.from(this.secretKey, 'hex').length !== 32) {
            throw new Error('CRITICAL: CREDENTIAL_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)');
        }
    }

    public encrypt(text: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.getKeyBuffer(), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        return `${iv.toString('hex')}:${encrypted}:${authTag}`;
    }

    public decrypt(text: string): string {
        const [ivHex, encryptedHex, authTagHex] = text.split(':');
        const decipher = crypto.createDecipheriv(
            this.algorithm,
            this.getKeyBuffer(),
            Buffer.from(ivHex, 'hex'),
        );
        decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    async create(createCredentialDto: CreateCredentialDto, userId: string) {
        const { password, ...rest } = createCredentialDto;
        const encryptedPassword = this.encrypt(password);

        // TODO: Emit an event to AuditLog that a credential was created

        const created = await this.prisma.credential.create({
            data: {
                ...rest,
                encryptedPassword,
            },
        });

        await this.prisma.auditLog.create({
            data: {
                userId,
                action: AuditAction.CREATE_CREDENTIAL,
                targetId: created.id,
                details: JSON.stringify({
                    username: created.username,
                    assetId: created.assetId,
                    type: created.type,
                }),
            },
        });

        return created;
    }

    async findByAsset(assetId: string) {
        return this.prisma.credential.findMany({
            where: { assetId },
            select: {
                id: true,
                assetId: true,
                username: true,
                lastChangedDate: true,
                createdAt: true,
                updatedAt: true,
                // specifically NOT selecting encryptedPassword here
            },
        });
    }

    async revealPassword(id: string, userId: string) {
        const credential = await this.prisma.credential.findUnique({
            where: { id },
        });

        if (!credential) {
            throw new NotFoundException(`Credential ${id} not found`);
        }

        // Emit audit log event when someone reveals a password
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

    async update(id: string, updateCredentialDto: UpdateCredentialDto, userId: string) {
        const { password, ...rest } = updateCredentialDto;

        const dataToUpdate: Prisma.CredentialUpdateInput = { ...rest };
        if (password) {
            dataToUpdate.encryptedPassword = this.encrypt(password);
            dataToUpdate.lastChangedDate = new Date();
        }

        const updated = await this.prisma.credential.update({
            where: { id },
            data: dataToUpdate,
        });

        await this.prisma.auditLog.create({
            data: {
                userId,
                action: AuditAction.UPDATE_CREDENTIAL,
                targetId: id,
                details: JSON.stringify({
                    username: updated.username,
                    passwordChanged: !!password,
                }),
            },
        });

        return updated;
    }

    async remove(id: string, userId: string) {
        const credential = await this.prisma.credential.findUnique({ where: { id } });
        if (!credential) throw new NotFoundException('Credential not found');

        const deleted = await this.prisma.credential.delete({
            where: { id },
        });

        await this.prisma.auditLog.create({
            data: {
                userId,
                action: 'DELETE_ASSET', // Reusing action or should I use a generic one? enum doesn't have DELETE_CREDENTIAL
                targetId: id,
                details: `Deleted credential ${credential.username} from asset ${credential.assetId}`,
            },
        });

        return deleted;
    }

    private getKeyBuffer(): Buffer {
        if (/^[0-9a-fA-F]{64}$/.test(this.secretKey)) {
            return Buffer.from(this.secretKey, 'hex');
        }

        return Buffer.from(this.secretKey);
    }
}
