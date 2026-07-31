import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'assets');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
];

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
};

function hasSignature(mimetype: string, buffer: Buffer): boolean {
  switch (mimetype) {
    case 'image/jpeg':
      return (
        buffer.length >= 3 &&
        buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
      );
    case 'image/png':
      return buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/gif': {
      const header = buffer.subarray(0, 6).toString('ascii');
      return header === 'GIF87a' || header === 'GIF89a';
    }
    case 'image/webp':
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    case 'application/pdf':
      return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    case 'text/plain':
      try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
        return !text.includes('\0');
      } catch {
        return false;
      }
    default:
      return false;
  }
}

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
    if (!file?.buffer) {
      throw new BadRequestException('A file is required');
    }
    const sizeBytes = file.size ?? file.buffer.length;

    // Verify asset exists
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });
    if (!asset) throw new NotFoundException(`Asset ${assetId} not found`);

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (sizeBytes > MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 10 MB limit');
    }

    if (!hasSignature(file.mimetype, file.buffer)) {
      throw new BadRequestException(
        `File signature does not match declared MIME type ${file.mimetype}`,
      );
    }

    const storedFilename = `${randomUUID()}${MIME_EXTENSIONS[file.mimetype]}`;
    const storedPath = path.join(UPLOAD_DIR, storedFilename);

    await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
    try {
      await fs.promises.writeFile(storedPath, file.buffer, { flag: 'wx' });
    } catch (error) {
      throw new BadRequestException('Unable to store uploaded file', {
        cause: error,
      });
    }

    let attachment;
    try {
      attachment = await this.prisma.assetAttachment.create({
        data: {
          assetId,
          filename: file.originalname,
          storedPath: `uploads/assets/${storedFilename}`,
          mimeType: file.mimetype,
          sizeBytes,
          createdByUserId: userId,
        },
        include: {
          createdByUser: {
            select: { id: true, displayName: true, avatarSeed: true },
          },
        },
      });
    } catch (error) {
      await this.removeStoredFile(storedPath);
      throw error;
    }

    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.UPLOAD_ASSET_ATTACHMENT,
          targetId: attachment.id,
          details: JSON.stringify({
            assetId,
            filename: attachment.filename,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
          }),
        },
      });
    } catch (error) {
      // Keep a successfully persisted attachment usable even if audit storage
      // is temporarily unavailable. The failure remains visible in logs.
      console.error('Failed to record attachment upload audit log', error);
    }

    return attachment;
  }

  private async removeStoredFile(filePath: string) {
    try {
      await fs.promises.unlink(filePath);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`Failed to remove attachment file ${filePath}`, error);
      }
    }
  }

  async findAllAttachments(assetId: string) {
    return this.prisma.assetAttachment.findMany({
      where: { assetId },
      include: {
        createdByUser: {
          select: { id: true, displayName: true, avatarSeed: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteAttachment(
    assetId: string,
    attachmentId: string,
    userId: string,
  ) {
    const attachment = await this.prisma.assetAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!attachment || attachment.assetId !== assetId) {
      throw new NotFoundException('Attachment not found');
    }

    const deleted = await this.prisma.assetAttachment.delete({
      where: { id: attachmentId },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.DELETE_ASSET_ATTACHMENT,
        targetId: attachmentId,
        details: JSON.stringify({ assetId, filename: attachment.filename }),
      },
    });

    // The database record is authoritative. Cleanup happens after deletion so
    // a filesystem error never leaves a live record pointing at a missing file.
    const fullPath = path.join(process.cwd(), attachment.storedPath);
    try {
      await fs.promises.unlink(fullPath);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(
          `Failed to remove orphaned attachment ${attachment.id}`,
          error,
        );
      }
    }
    return deleted;
  }

  async findOne(assetId: string, attachmentId: string) {
    const attachment = await this.prisma.assetAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!attachment || attachment.assetId !== assetId) {
      throw new NotFoundException('Attachment not found');
    }
    return attachment;
  }

  async logDownload(attachmentId: string, assetId: string, userId: string) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.DOWNLOAD_ASSET_ATTACHMENT,
        targetId: attachmentId,
        details: JSON.stringify({ assetId }),
      },
    });
  }

  getUploadDir() {
    return UPLOAD_DIR;
  }
}
