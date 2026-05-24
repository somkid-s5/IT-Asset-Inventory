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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
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
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { UpdateKnowledgeBaseDto } from './dto/update-knowledge-base.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/knowledge-base')
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  // --- Uploads ---
  @Roles(Role.ADMIN, Role.EDITOR)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = path.join(process.cwd(), 'uploads', 'kb');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const unique = randomUUID();
          const ext = extname(file.originalname);
          cb(null, `${unique}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('No file uploaded');
    const url = `/api/knowledge-base/images/${file.filename}`;
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
  removeCategory(@Param('id') id: string) {
    return this.knowledgeBaseService.deleteCategory(id);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Post('categories')
  createCategory(@Body() data: { name: string; icon?: string }) {
    return this.knowledgeBaseService.createCategory(data.name, data.icon);
  }

  @Public()
  @Get('categories/:id')
  findCategory(@Param('id') id: string) {
    return this.knowledgeBaseService.findCategory(id);
  }

  // --- Articles ---
  @Public()
  @Get('articles')
  findAllArticles(@Query('categoryId') categoryId?: string) {
    return this.knowledgeBaseService.findAllArticles(categoryId);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Post('articles')
  createArticle(
    @Body() data: CreateKnowledgeBaseDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.knowledgeBaseService.createArticle({
      ...data,
      authorId: req.user.id,
    });
  }

  @Public()
  @Get('articles/:id')
  findArticle(@Param('id') id: string) {
    return this.knowledgeBaseService.findArticle(id);
  }

  @Public()
  @Get('recent')
  getRecentArticles(@Query('limit') limit?: string) {
    return this.knowledgeBaseService.getRecentArticles(
      limit ? parseInt(limit) : 5,
    );
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Patch('articles/:id')
  updateArticle(@Param('id') id: string, @Body() data: UpdateKnowledgeBaseDto) {
    return this.knowledgeBaseService.updateArticle(id, data);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Delete('articles/:id')
  removeArticle(@Param('id') id: string) {
    return this.knowledgeBaseService.removeArticle(id);
  }
}
