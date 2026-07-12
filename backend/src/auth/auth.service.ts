import { AuditAction } from '@prisma/client';
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { createAvatarSeed } from './avatar-seed';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async getUserCount() {
    return this.prisma.user.count();
  }

  async register(registerDto: RegisterDto) {
    const { username, displayName, password } = registerDto;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const user = await this.prisma.$transaction(async (tx) => {
      // Serializes the bootstrap decision so two first registrations cannot
      // both receive ADMIN. The key is a fixed application-level lock ID.
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(812734)');
      const existingUser = await tx.user.findUnique({ where: { username } });
      if (existingUser) throw new ConflictException('Username already exists');

      const userCount = await tx.user.count();
      const created = await tx.user.create({
        data: {
          username,
          displayName,
          avatarSeed: createAvatarSeed(),
          email: null,
          passwordHash,
          role: userCount === 0 ? 'ADMIN' : 'VIEWER',
        },
      });
      await tx.auditLog.create({
        data: {
          userId: created.id,
          action: AuditAction.CREATE_USER,
          targetId: created.id,
          details: JSON.stringify({
            username: created.username,
            displayName: created.displayName,
            role: created.role,
            source: 'self-register',
          }),
        },
      });
      return created;
    });

    return {
      access_token: this.jwtService.sign({
        sub: user.id,
        username: user.username,
        role: user.role,
        mustChangePassword: false,
      }),
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarSeed: user.avatarSeed,
        avatarImage: user.avatarImage,
        role: user.role,
        mustChangePassword: false,
      },
    };
  }

  async login(loginDto: LoginDto, ipAddress: string | null = null) {
    const { username, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user || user.deletedAt) {
      // Log failed login attempt for non-existent or deleted user
      await this.prisma.auditLog.create({
        data: {
          userId: null,
          action: AuditAction.LOGIN_FAILED,
          ipAddress,
          details: JSON.stringify({
            username,
            reason: user ? 'User deactivated' : 'User not found',
          }),
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // Log failed login attempt for existing user
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: AuditAction.LOGIN_FAILED,
          ipAddress,
          details: JSON.stringify({
            username: user.username,
            reason: 'Incorrect password',
          }),
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.LOGIN,
        ipAddress,
        details: JSON.stringify({
          username: user.username,
          displayName: user.displayName,
          role: user.role,
        }),
      },
    });

    return {
      access_token: this.jwtService.sign({
        sub: user.id,
        username: user.username,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      }),
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarSeed: user.avatarSeed,
        avatarImage: user.avatarImage,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarSeed: user.avatarSeed,
        avatarImage: user.avatarImage,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async updateProfile(
    userId: string,
    displayName?: string,
    avatarSeed?: string,
    avatarImage?: string | null,
  ) {
    if (avatarImage) {
      if (!avatarImage.startsWith('data:image/')) {
        throw new ConflictException('Avatar image format is invalid');
      }
      if (
        avatarImage.startsWith('data:image/svg+xml') ||
        avatarImage.includes('image/svg+xml') ||
        avatarImage.toLowerCase().includes('<svg')
      ) {
        throw new ConflictException(
          'SVG avatars are not allowed for security reasons',
        );
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(displayName ? { displayName } : {}),
        ...(avatarSeed ? { avatarSeed } : {}),
        ...(avatarImage !== undefined ? { avatarImage } : {}),
      },
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarSeed: user.avatarSeed,
        avatarImage: user.avatarImage,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.CHANGE_OWN_PASSWORD,
        targetId: userId,
        details: JSON.stringify({
          source: 'self-service',
        }),
      },
    });

    return { success: true };
  }

  async logout(token: string) {
    try {
      const decoded: { exp?: number } | null = this.jwtService.decode(token);
      const expiresAt = decoded?.exp
        ? new Date(decoded.exp * 1000)
        : new Date(Date.now() + 24 * 60 * 60 * 1000);

      await this.prisma.tokenBlocklist.upsert({
        where: { token },
        create: { token, expiresAt },
        update: {},
      });
    } catch (err) {
      console.error('Failed to blocklist token:', err);
    }
  }
}
