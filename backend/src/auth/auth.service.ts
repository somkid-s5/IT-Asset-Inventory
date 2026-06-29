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

    const existingUser = await this.prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Provide ADMIN role to the first user created, others get viewer or default.
    const userCount = await this.prisma.user.count();
    const role = userCount === 0 ? 'ADMIN' : 'VIEWER';

    const user = await this.prisma.user.create({
      data: {
        username,
        displayName,
        avatarSeed: createAvatarSeed(),
        email: null,
        passwordHash,
        role,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.CREATE_USER,
        targetId: user.id,
        details: JSON.stringify({
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          source: 'self-register',
        }),
      },
    });

    return {
      access_token: this.jwtService.sign({
        sub: user.id,
        username: user.username,
        role: user.role,
      }),
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarSeed: user.avatarSeed,
        avatarImage: user.avatarImage,
        role: user.role,
      },
    };
  }

  async login(loginDto: LoginDto, ipAddress: string | null = null) {
    const { username, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      // Log failed login attempt for non-existent user
      await this.prisma.auditLog.create({
        data: {
          userId: null,
          action: AuditAction.LOGIN_FAILED,
          ipAddress,
          details: JSON.stringify({
            username,
            reason: 'User not found',
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
      }),
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarSeed: user.avatarSeed,
        avatarImage: user.avatarImage,
        role: user.role,
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
      data: { passwordHash },
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
      const decoded = this.jwtService.decode(token);
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
