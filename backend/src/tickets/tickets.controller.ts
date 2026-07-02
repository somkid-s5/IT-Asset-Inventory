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
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // Service Desk access for all roles: any authenticated user (incl. VIEWER)
  // can open an IT ticket. Editing ticket state (priority/status/assignment)
  // remains ADMIN/EDITOR below.
  @Post()
  create(
    @Body() createTicketDto: CreateTicketDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.ticketsService.create(createTicketDto, req.user.id);
  }

  @Get()
  findAll() {
    return this.ticketsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  update(
    @Param('id') id: string,
    @Body() updateTicketDto: UpdateTicketDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.ticketsService.update(id, updateTicketDto, req.user.id);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.ticketsService.remove(id, req.user.id);
  }
}
