/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Body,
  Controller,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { InventoryExportDto } from './export.dto';
import { InventoryExportService } from './inventory-export.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/export')
export class InventoryExportController {
  constructor(private readonly service: InventoryExportService) {}
  @Roles(Role.ADMIN)
  @Post('inventory')
  async export(
    @Body() dto: InventoryExportDto,
    @Request() req: { user: { id: string } },
    @Res() res: Response,
  ) {
    const workbook = await this.service.createWorkbook(
      dto.passphrase,
      req.user.id,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="inventory-export.xlsx"',
    );
    res.send(workbook);
  }
}
