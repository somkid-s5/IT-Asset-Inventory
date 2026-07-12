import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { BulkImportAssetsDto } from './dto/bulk-import-assets.dto';
import { BulkUpdateAssetsDto } from './dto/bulk-update-assets.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Roles(Role.ADMIN, Role.EDITOR)
  @Post()
  create(
    @Body() createAssetDto: CreateAssetDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.assetsService.create(createAssetDto, req.user.id);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Post('bulk-import')
  bulkImport(
    @Body() dto: BulkImportAssetsDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.assetsService.bulkImport(dto.rows, req.user.id);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Patch('bulk-update')
  bulkUpdate(
    @Body() dto: BulkUpdateAssetsDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.assetsService.bulkUpdate(dto, req.user.id);
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('environment') environment?: string,
    @Query('owner') owner?: string,
    @Query('location') location?: string,
  ) {
    return this.assetsService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 100,
      { q, type, status, environment, owner, location },
    );
  }

  @Get('data-quality/summary')
  getDataQualitySummary() {
    return this.assetsService.getDataQualitySummary();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Get(':id/audit-logs')
  getAuditLogs(@Param('id') id: string) {
    return this.assetsService.getAuditLogs(id);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAssetDto: UpdateAssetDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.assetsService.update(id, updateAssetDto, req.user.id);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.assetsService.remove(id, req.user.id);
  }
}
