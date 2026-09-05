import {
  Body,
  Delete,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateDatabaseDto } from './dto/create-database.dto';
import { UpdateDatabaseDto } from './dto/update-database.dto';
import { LogicalDatabaseDto } from './dto/logical-database.dto';
import { DatabasesService } from './databases.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/databases')
export class DatabasesController {
  constructor(private readonly databasesService: DatabasesService) {}

  @Roles(Role.ADMIN, Role.EDITOR)
  @Post()
  create(
    @Body() createDatabaseDto: CreateDatabaseDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.databasesService.create(createDatabaseDto, req.user.id);
  }

  @Get()
  findAll(@Query('includeArchived') includeArchived?: string) {
    return this.databasesService.findAll(includeArchived === 'true');
  }

  @Get('data-quality/summary')
  getDataQualitySummary() {
    return this.databasesService.getDataQualitySummary();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.databasesService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDatabaseDto: UpdateDatabaseDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.databasesService.update(id, updateDatabaseDto, req.user.id);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Post(':id/logical-databases')
  createLogicalDatabase(
    @Param('id') id: string,
    @Body() dto: LogicalDatabaseDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.databasesService.createLogicalDatabase(id, dto, req.user.id);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Patch(':id/logical-databases/:logicalId')
  updateLogicalDatabase(
    @Param('id') id: string,
    @Param('logicalId') logicalId: string,
    @Body() dto: LogicalDatabaseDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.databasesService.updateLogicalDatabase(
      id,
      logicalId,
      dto,
      req.user.id,
    );
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Delete(':id/logical-databases/:logicalId')
  deleteLogicalDatabase(
    @Param('id') id: string,
    @Param('logicalId') logicalId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.databasesService.deleteLogicalDatabase(
      id,
      logicalId,
      req.user.id,
    );
  }

  @Roles(Role.ADMIN)
  @Patch(':id/archive')
  archive(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.databasesService.remove(id, req.user.id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/restore')
  restore(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.databasesService.restore(id, req.user.id);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Get(':id/accounts/:accountId/password')
  revealPassword(
    @Param('id') id: string,
    @Param('accountId') accountId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.databasesService.revealPassword(id, accountId, req.user.id);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Post(':id/accounts/:accountId/copy')
  recordCopy(
    @Param('id') id: string,
    @Param('accountId') accountId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.databasesService.recordCopy(id, accountId, req.user.id);
  }
}
