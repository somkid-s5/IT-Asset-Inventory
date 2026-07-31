import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { randomUUID } from 'crypto';
import type { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { KnowledgeBaseService } from './knowledge-base.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { Public } from '../auth/public.decorator';
import { UpdateKnowledgeBaseDto } from './dto/update-knowledge-base.dto';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const IMAGE_SIGNATURES: Record<
  string,
  { extension: string; matches: (buffer: Buffer) => boolean }
> = {
  'image/png': {
    extension: '.png',
    matches: (buffer) =>
      buffer.length >= 8 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  'image/jpeg': {
    extension: '.jpg',
    matches: (buffer) =>
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff,
  },
  'image/gif': {
    extension: '.gif',
    matches: (buffer) =>
      buffer.length >= 6 &&
      (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' ||
        buffer.subarray(0, 6).toString('ascii') === 'GIF89a'),
  },
  'image/webp': {
    extension: '.webp',
    matches: (buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP',
  },
};

interface AuthRequest {
  user: { id: string };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/knowledge-base')
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  // --- Uploads ---
  @Roles(Role.ADMIN, Role.EDITOR)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_SIZE },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthRequest,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('No image file uploaded');
    }

    const signature = IMAGE_SIGNATURES[file.mimetype];
    if (!signature) {
      throw new BadRequestException(
        'Only PNG, JPEG, GIF, and WebP images are supported. SVG is not allowed.',
      );
    }
    if (!signature.matches(file.buffer)) {
      throw new BadRequestException(
        'The uploaded file signature does not match its declared image type.',
      );
    }

    const uploadDir = path.join(process.cwd(), 'uploads', 'kb');
    await fs.promises.mkdir(uploadDir, { recursive: true });
    const filename = `${randomUUID()}${signature.extension}`;
    const filePath = path.join(uploadDir, filename);
    await fs.promises.writeFile(filePath, file.buffer, { flag: 'wx' });
    try {
      await this.knowledgeBaseService.recordImageUpload(filename, req.user.id);
    } catch (error) {
      await fs.promises.unlink(filePath).catch(() => undefined);
      throw error;
    }

    const url = `/api/knowledge-base/images/${filename}`;
    return { url };
  }

  @Public()
  @Get('images/:filename')
  serveImage(@Param('filename') filename: string, @Res() res: Response) {
    const safeName = path.basename(filename);
    const filePath = path.join(process.cwd(), 'uploads', 'kb', safeName);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: 'Image not found' });
      return;
    }
    res.sendFile(filePath);
  }

  // --- Categories ---
  @Public()
  @Get('categories')
  findAllCategories() {
    return this.knowledgeBaseService.findAllCategories();
  }

  @Roles(Role.ADMIN)
  @Post('categories/initialize')
  initializeCategories(@Request() req: { user: { id: string } }) {
    return this.knowledgeBaseService.initializeDefaults(req.user.id);
  }

  @Roles(Role.ADMIN)
  @Delete('categories/:id')
  removeCategory(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.knowledgeBaseService.deleteCategory(id, req.user.id);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Post('categories')
  createCategory(
    @Body() data: { name: string; icon?: string },
    @Request() req: AuthRequest,
  ) {
    return this.knowledgeBaseService.createCategory(
      data.name,
      data.icon,
      req.user.id,
    );
  }

  @Public()
  @Get('categories/:id')
  findCategory(@Param('id') id: string) {
    return this.knowledgeBaseService.findCategory(id);
  }

  // --- Documents ---
  @Public()
  @Get('documents')
  findAllDocuments(@Query('categoryId') categoryId?: string) {
    return this.knowledgeBaseService.findAllDocuments(categoryId);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Post('documents')
  createDocument(
    @Body()
    data: {
      title: string;
      content: string;
      categoryId: string;
      authorId: string;
    },
    @Request() req: AuthRequest,
  ) {
    return this.knowledgeBaseService.createDocument({
      ...data,
      authorId: req.user.id,
    });
  }

  @Public()
  @Get('documents/:id')
  findDocument(@Param('id') id: string) {
    return this.knowledgeBaseService.findDocument(id);
  }

  @Public()
  @Get('recent/documents')
  getRecentDocuments(@Query('limit') limit?: string) {
    return this.knowledgeBaseService.getRecentDocuments(
      limit ? parseInt(limit) : 5,
    );
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Patch('documents/:id')
  updateDocument(
    @Param('id') id: string,
    @Body() data: UpdateKnowledgeBaseDto,
    @Request() req: AuthRequest,
  ) {
    return this.knowledgeBaseService.updateDocument(id, data, req.user.id);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Delete('documents/:id')
  removeDocument(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.knowledgeBaseService.removeDocument(id, req.user.id);
  }
}
