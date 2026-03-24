import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Role, VmLifecycleState } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SaveVmDraftDto } from './dto/save-vm-draft.dto';
import { SaveVmSourceDto } from './dto/save-vm-source.dto';
import { TestVmSourceConnectionDto } from './dto/test-vm-source-connection.dto';
import { VmService } from './vm.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/vm')
export class VmController {
  constructor(private readonly vmService: VmService) {}

  @Get('sources')
  findSources() {
    return this.vmService.findSources();
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Post('sources')
  createSource(@Body() dto: SaveVmSourceDto, @Request() req: { user: { id: string } }) {
    return this.vmService.createSource(dto, req.user.id);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Patch('sources/:id')
  updateSource(@Param('id') id: string, @Body() dto: SaveVmSourceDto) {
    return this.vmService.updateSource(id, dto);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Delete('sources/:id')
  removeSource(@Param('id') id: string) {
    return this.vmService.removeSource(id);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Post('sources/sync-all')
  syncAllSources() {
    return this.vmService.syncAllSources();
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Post('sources/test-connection')
  testSourceConnection(@Body() dto: TestVmSourceConnectionDto) {
    return this.vmService.testSourceConnection(dto);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Post('sources/:id/sync')
  syncSource(@Param('id') id: string) {
    return this.vmService.syncSource(id);
  }

  @Get('discoveries')
  findDiscoveries() {
    return this.vmService.findDiscoveries();
  }

  @Get('discoveries/:id')
  findDiscovery(@Param('id') id: string) {
    return this.vmService.findDiscovery(id);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Patch('discoveries/:id')
  updateDiscovery(
    @Param('id') id: string,
    @Body() dto: SaveVmDraftDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.vmService.updateDiscovery(id, dto, req.user.id);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Post('discoveries/:id/promote')
  promoteDiscovery(
    @Param('id') id: string,
    @Body() dto: SaveVmDraftDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.vmService.promoteDiscovery(id, dto, req.user.id);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Post('discoveries/:id/archive')
  archiveDiscovery(@Param('id') id: string) {
    return this.vmService.archiveDiscovery(id);
  }

  @Get('inventory')
  findInventory() {
    return this.vmService.findInventory();
  }

  @Get('inventory/:id')
  findInventoryById(@Param('id') id: string) {
    return this.vmService.findInventoryById(id);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Patch('inventory/:id')
  updateInventory(
    @Param('id') id: string,
    @Body() dto: SaveVmDraftDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.vmService.updateInventory(id, dto, req.user.id);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Post('inventory/:id/archive')
  archiveInventory(@Param('id') id: string, @Body('lifecycleState') lifecycleState?: VmLifecycleState) {
    return this.vmService.archiveInventory(id, lifecycleState);
  }
}
