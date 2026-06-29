import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import * as express from 'express';
import { join } from 'path';
import * as fs from 'fs';

@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  @Get('*')
  serveFile(@Param('0') filepath: string, @Res() res: express.Response) {
    if (!filepath) {
      throw new BadRequestException('Filepath is required');
    }

    // Resolve absolute path and prevent directory traversal
    const uploadsDir = join(process.cwd(), 'uploads');
    const safePath = join(uploadsDir, filepath);

    if (!safePath.startsWith(uploadsDir)) {
      throw new BadRequestException('Invalid path access');
    }

    if (!fs.existsSync(safePath)) {
      throw new NotFoundException('File not found');
    }

    const stat = fs.statSync(safePath);
    if (stat.isDirectory()) {
      throw new BadRequestException('Requested path is a directory');
    }

    return res.sendFile(safePath);
  }
}
