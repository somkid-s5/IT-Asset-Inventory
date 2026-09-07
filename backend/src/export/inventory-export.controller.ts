import {
  BadRequestException,
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
import { AuthService } from '../auth/auth.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/export')
export class InventoryExportController {
  constructor(
    private readonly service: InventoryExportService,
    private readonly authService: AuthService,
  ) {}
  @Roles(Role.ADMIN)
  @Post('inventory')
  async export(
    @Body() dto: InventoryExportDto,
    @Request() req: { user: { id: string } },
    @Res() res: Response,
  ) {
    if (dto.passphrase !== dto.confirmPassphrase) {
      throw new BadRequestException(
        'Export passphrase confirmation does not match.',
      );
    }
    await this.authService.verifyCurrentPassword(
      req.user.id,
      dto.currentPassword,
    );
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
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('Pragma', 'no-cache');
    res.send(workbook);
  }
}
