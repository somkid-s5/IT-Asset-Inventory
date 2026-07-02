import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('api/clients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  // Any authenticated user (incl. VIEWER) can read/lookup clients — needed for
  // the ticket form's client autocomplete. Mutations require ADMIN/EDITOR.
  @Post()
  @Roles(Role.ADMIN, Role.EDITOR)
  create(
    @Body() createClientDto: CreateClientDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.clientsService.create(createClientDto, req.user.id);
  }

  @Get()
  findAll() {
    return this.clientsService.findAll();
  }

  @Get('search')
  search(@Query('q') query: string) {
    return this.clientsService.search(query || '');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  update(
    @Param('id') id: string,
    @Body() updateClientDto: UpdateClientDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.clientsService.update(id, updateClientDto, req.user.id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.clientsService.remove(id, req.user.id);
  }
}
