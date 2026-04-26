import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateDatabaseDto } from './dto/create-database.dto';
import { UpdateDatabaseDto } from './dto/update-database.dto';
import { DatabasesService } from './databases.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/databases')
export class DatabasesController {
  constructor(private readonly databasesService: DatabasesService) {}

  @Roles(Role.ADMIN, Role.EDITOR)
  @Post()
  create(@Body() createDatabaseDto: CreateDatabaseDto, @Request() req: { user: { id: string } }) {
    return this.databasesService.create(createDatabaseDto, req.user.id);
  }

  @Get()
  findAll() {
    return this.databasesService.findAll();
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
    @Request() req: { user: { id: string } }
  ) {
    return this.databasesService.update(id, updateDatabaseDto, req.user.id);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.databasesService.remove(id, req.user.id);
  }
}
