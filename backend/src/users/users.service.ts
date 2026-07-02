import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { createAvatarSeed } from '../auth/avatar-seed';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarSeed: true,
        avatarImage: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return users;
  }

  async create(createUserDto: CreateUserDto, actorUserId: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { username: createUserDto.username },
    });

    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username: createUserDto.username,
        displayName: createUserDto.displayName,
        avatarSeed: createAvatarSeed(),
        email: null,
        passwordHash,
        role: createUserDto.role,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarSeed: true,
        avatarImage: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorUserId,
        action: AuditAction.CREATE_USER,
        targetId: user.id,
        details: JSON.stringify({
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          source: 'admin-create',
        }),
      },
    });

    return user;
  }

  async updateRole(userId: string, role: Role, currentUserId: string) {
    const updatedUser = await this.prisma.$transaction(async (tx) => {
      // Lock admin rows to prevent TOCTOU race condition
      await tx.$queryRaw`SELECT id FROM "User" WHERE role = 'ADMIN'::"Role" FOR UPDATE`;

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          deletedAt: true,
        },
      });

      if (!user || user.deletedAt) {
        throw new NotFoundException('User not found');
      }

      if (user.id === currentUserId && role !== Role.ADMIN) {
        throw new BadRequestException('You cannot remove your own admin role');
      }

      if (user.role === Role.ADMIN && role !== Role.ADMIN) {
        const adminCount = await tx.user.count({
          where: { role: Role.ADMIN },
        });

        if (adminCount <= 1) {
          throw new BadRequestException(
            'At least one admin account must remain',
          );
        }
      }

      return tx.user.update({
        where: { id: userId },
        data: { role },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarSeed: true,
          avatarImage: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    await this.prisma.auditLog.create({
      data: {
        userId: currentUserId,
        action: AuditAction.UPDATE_USER_ROLE,
        targetId: userId,
        details: JSON.stringify({
          role,
        }),
      },
    });

    return updatedUser;
  }

  async remove(userId: string, currentUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        username: true,
        email: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    if (user.id === currentUserId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    if (user.role === Role.ADMIN) {
      const adminCount = await this.prisma.user.count({
        where: { role: Role.ADMIN, deletedAt: null },
      });

      if (adminCount <= 1) {
        throw new BadRequestException('At least one admin account must remain');
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        username: `${user.username}_deleted_${Date.now()}`,
        ...(user.email && { email: `${user.email}_deleted_${Date.now()}` }),
      },
    });

    return { success: true };
  }

  async resetPassword(userId: string, password: string, actorUserId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, displayName: true, deletedAt: true },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    if (actorUserId) {
      await this.prisma.auditLog.create({
        data: {
          userId: actorUserId,
          action: AuditAction.RESET_USER_PASSWORD,
          targetId: userId,
          details: JSON.stringify({
            username: user.username,
            displayName: user.displayName,
          }),
        },
      });
    }

    return { success: true };
  }
}
