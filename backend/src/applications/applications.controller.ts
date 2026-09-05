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
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ComponentDto, EnvironmentDto } from './dto/topology.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/applications')
export class ApplicationsController {
  constructor(private readonly service: ApplicationsService) {}
  @Get() findAll(
    @Query('includeArchived') includeArchived?: string,
    @Query('q') q?: string,
  ) {
    return this.service.findAll(includeArchived === 'true', q);
  }
  @Get('data-quality/summary') getDataQualitySummary() {
    return this.service.getDataQualitySummary();
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
  @Roles(Role.ADMIN, Role.EDITOR)
  @Post(':id/environments')
  createEnvironment(
    @Param('id') id: string,
    @Body() dto: EnvironmentDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.createEnvironment(id, dto, req.user.id);
  }
  @Roles(Role.ADMIN, Role.EDITOR)
  @Patch(':id/environments/:environmentId')
  updateEnvironment(
    @Param('id') id: string,
    @Param('environmentId') environmentId: string,
    @Body() dto: EnvironmentDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.updateEnvironment(id, environmentId, dto, req.user.id);
  }
  @Roles(Role.ADMIN, Role.EDITOR)
  @Delete(':id/environments/:environmentId')
  deleteEnvironment(
    @Param('id') id: string,
    @Param('environmentId') environmentId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.deleteEnvironment(id, environmentId, req.user.id);
  }
  @Roles(Role.ADMIN, Role.EDITOR)
  @Post(':id/environments/:environmentId/components')
  createComponent(
    @Param('id') id: string,
    @Param('environmentId') environmentId: string,
    @Body() dto: ComponentDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.createComponent(id, environmentId, dto, req.user.id);
  }
  @Roles(Role.ADMIN, Role.EDITOR)
  @Patch(':id/environments/:environmentId/components/:componentId')
  updateComponent(
    @Param('id') id: string,
    @Param('environmentId') environmentId: string,
    @Param('componentId') componentId: string,
    @Body() dto: ComponentDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.updateComponent(
      id,
      environmentId,
      componentId,
      dto,
      req.user.id,
    );
  }
  @Roles(Role.ADMIN, Role.EDITOR)
  @Delete(':id/environments/:environmentId/components/:componentId')
  deleteComponent(
    @Param('id') id: string,
    @Param('environmentId') environmentId: string,
    @Param('componentId') componentId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.deleteComponent(
      id,
      environmentId,
      componentId,
      req.user.id,
    );
  }
  @Roles(Role.ADMIN, Role.EDITOR) @Post() create(
    @Body() dto: CreateApplicationDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.create(dto, req.user.id);
  }
  @Roles(Role.ADMIN, Role.EDITOR) @Patch(':id') update(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.update(id, dto, req.user.id);
  }
  @Roles(Role.ADMIN, Role.EDITOR) @Patch(':id/archive') archive(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.archive(id, req.user.id);
  }
  @Roles(Role.ADMIN) @Patch(':id/restore') restore(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.restore(id, req.user.id);
  }
  @Roles(Role.ADMIN, Role.EDITOR)
  @Get(':id/credentials/:credentialId/password')
  reveal(
    @Param('id') id: string,
    @Param('credentialId') credentialId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.revealCredential(id, credentialId, req.user.id);
  }
}
