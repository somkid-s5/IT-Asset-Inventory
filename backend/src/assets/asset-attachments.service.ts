import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'assets');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
];

@Injectable()
export class AssetAttachmentsService {
    constructor(private prisma: PrismaService) {
        // Ensure upload directory exists
        if (!fs.existsSync(UPLOAD_DIR)) {
            fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        }
    }

    async saveAttachment(
        assetId: string,
        file: Express.Multer.File,
        userId: string,
    ) {
        // Verify asset exists
        const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
        if (!asset) throw new NotFoundException(`Asset ${assetId} not found`);

        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            throw new BadRequestException(
                `File type ${file.mimetype} is not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            throw new BadRequestException('File size exceeds 10 MB limit');
        }

        return this.prisma.assetAttachment.create({
            data: {
                assetId,
                filename: file.originalname,
                storedPath: `uploads/assets/${file.filename}`,
                mimeType: file.mimetype,
                sizeBytes: file.size,
                createdByUserId: userId,
            },
            include: {
                createdByUser: { select: { id: true, displayName: true, avatarSeed: true } },
            },
        });
    }

    async findAllAttachments(assetId: string) {
        return this.prisma.assetAttachment.findMany({
            where: { assetId },
            include: {
                createdByUser: { select: { id: true, displayName: true, avatarSeed: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async deleteAttachment(assetId: string, attachmentId: string) {
        const attachment = await this.prisma.assetAttachment.findUnique({
            where: { id: attachmentId },
        });
        if (!attachment || attachment.assetId !== assetId) {
            throw new NotFoundException('Attachment not found');
        }

        // Delete file from disk
        const fullPath = path.join(process.cwd(), attachment.storedPath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }

        return this.prisma.assetAttachment.delete({ where: { id: attachmentId } });
    }

    getUploadDir() {
        return UPLOAD_DIR;
    }
}
