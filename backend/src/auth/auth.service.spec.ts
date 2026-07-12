import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
  genSalt: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockUser = {
    id: 'user-id-1',
    username: 'testuser',
    displayName: 'Test User',
    avatarSeed: 'seed',
    avatarImage: null,
    passwordHash: 'hashedpassword',
    role: 'VIEWER',
    mustChangePassword: true,
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    tokenBlocklist: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockJwt = {
    sign: jest.fn().mockReturnValue('jwt-token'),
    decode: jest.fn(),
  };

  beforeEach(async () => {
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        user: mockPrisma.user,
        auditLog: mockPrisma.auditLog,
        $executeRawUnsafe: jest.fn(),
      }),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserCount', () => {
    it('should return user count', async () => {
      mockPrisma.user.count.mockResolvedValue(5);
      const count = await service.getUserCount();
      expect(count).toBe(5);
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ username: 'nonexistent', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ username: 'testuser', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return token and user details if login is successful', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        username: 'testuser',
        password: 'correctpassword',
      });

      expect(result).toHaveProperty('access_token');
      expect(result.user.mustChangePassword).toBe(true);
    });
  });

  describe('me', () => {
    it('should return user details on success', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.me('user-id-1');
      expect(result.user.username).toBe('testuser');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.me('invalid-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('changePassword', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.changePassword('nonexistent', 'oldpass', 'newpass'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if current password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('user-id-1', 'wrongpass', 'newpass'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should change password and update mustChangePassword to false', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newhash');

      await service.changePassword(
        'user-id-1',
        'correctpassword',
        'newpassword',
      );

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id-1' },
        data: {
          passwordHash: 'newhash',
          mustChangePassword: false,
        },
      });
    });
  });

  describe('register', () => {
    it('should throw ConflictException if username already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      await expect(
        service.register({
          username: 'testuser',
          displayName: 'Test',
          password: 'password',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should register a new user as ADMIN if it is the first user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.create.mockResolvedValue({
        ...mockUser,
        role: 'ADMIN',
        mustChangePassword: false,
      });
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      const result = await service.register({
        username: 'newadmin',
        displayName: 'Admin',
        password: 'password',
      });

      expect(result.user.role).toBe('ADMIN');
      expect(result.user.mustChangePassword).toBe(false);
    });
  });

  describe('updateProfile', () => {
    it('should throw ConflictException if avatar image is not valid data url', async () => {
      await expect(
        service.updateProfile('user-id-1', 'Name', 'seed', 'badimage'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if avatar image is SVG', async () => {
      await expect(
        service.updateProfile(
          'user-id-1',
          'Name',
          'seed',
          'data:image/svg+xml;base64,123',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should successfully update user profile', async () => {
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        displayName: 'Updated Name',
      });

      const result = await service.updateProfile('user-id-1', 'Updated Name');
      expect(result.user.displayName).toBe('Updated Name');
    });
  });

  describe('logout', () => {
    it('should add token to blocklist', async () => {
      mockJwt.decode.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      mockPrisma.tokenBlocklist.upsert.mockResolvedValue({
        token: 'jwt-token',
      });

      await service.logout('jwt-token');

      expect(mockPrisma.tokenBlocklist.upsert).toHaveBeenCalled();
    });

    it('should handle error if token payload is invalid', async () => {
      mockJwt.decode.mockReturnValue(null);
      await service.logout('bad-token');
      expect(mockPrisma.tokenBlocklist.upsert).toHaveBeenCalled();
    });
  });
});
