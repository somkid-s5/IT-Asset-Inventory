import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UsersService } from './users.service';

@Controller('api/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  create(
    @Body() createUserDto: CreateUserDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.usersService.create(createUserDto, req.user.id);
  }

  @Patch(':id/role')
  updateRole(
    @Param('id') userId: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.usersService.updateRole(
      userId,
      updateUserRoleDto.role,
      req.user.id,
    );
  }

  @Delete(':id')
  remove(
    @Param('id') userId: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.usersService.remove(userId, req.user.id);
  }

  @Patch(':id/reset-password')
  resetPassword(
    @Param('id') userId: string,
    @Body() resetPasswordDto: ResetPasswordDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.usersService.resetPassword(
      userId,
      resetPasswordDto.password,
      req.user.id,
    );
  }
}
