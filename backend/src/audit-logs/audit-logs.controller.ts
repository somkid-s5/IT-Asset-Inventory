import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuditLogsService } from './audit-logs.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { RecordExportDto } from './dto/record-export.dto';

@Controller('api/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.EDITOR)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '100',
  ) {
    return this.auditLogsService.findAll(Number(page), Number(limit));
  }

  @Post('export')
  recordExport(
    @Body() data: RecordExportDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.auditLogsService.recordExport(req.user.id, data);
  }
}
