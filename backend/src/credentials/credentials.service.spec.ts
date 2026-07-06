import { Test, TestingModule } from '@nestjs/testing';
import { CredentialsService } from './credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('CredentialsService', () => {
  let service: CredentialsService;
  let prisma: PrismaService;

  // 32-byte key (64 hex chars)
  const validHexKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  const mockCredentialRecord = {
    id: 'cred-1',
    username: 'admin',
    assetId: 'asset-1',
    type: 'SSH',
    encryptedPassword: 'mock-encrypted-password',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastChangedDate: null,
  };

  const mockPrisma = {
    credential: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = validHexKey;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CredentialsService>(CredentialsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Constructor Key Validation', () => {
    it('should throw error if key is not hex 64 characters', () => {
      process.env.CREDENTIAL_ENCRYPTION_KEY = 'shortkey123';
      expect(() => new CredentialsService(prisma)).toThrow(
        'CRITICAL: CREDENTIAL_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)'
      );
    });

    it('should throw error if key contains non-hex characters', () => {
      process.env.CREDENTIAL_ENCRYPTION_KEY = 'g123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      expect(() => new CredentialsService(prisma)).toThrow();
    });

    it('should successfully initialize with a valid 64 character hex key', () => {
      process.env.CREDENTIAL_ENCRYPTION_KEY = validHexKey;
      const validService = new CredentialsService(prisma);
      expect(validService).toBeDefined();
    });
  });

  describe('Encryption & Decryption', () => {
    it('should correctly encrypt and decrypt text', () => {
      const plaintext = 'SuperSecretP@ssword123';
      const encrypted = service.encrypt(plaintext);
      
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.split(':')).toHaveLength(3); // iv:ciphertext:tag

      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('create', () => {
    it('should encrypt password and save credential record', async () => {
      mockPrisma.credential.create.mockResolvedValue(mockCredentialRecord);

      const result = await service.create({
        username: 'admin',
        password: 'mypassword',
        assetId: 'asset-1',
        type: 'SSH',
      }, 'user-1');

      expect(result.username).toBe('admin');
      expect(mockPrisma.credential.create).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('findByAsset', () => {
    it('should return credential records for an asset without passwords', async () => {
      mockPrisma.credential.findMany.mockResolvedValue([
        { id: 'cred-1', username: 'admin', assetId: 'asset-1' }
      ]);

      const result = await service.findByAsset('asset-1');

      expect(result).toHaveLength(1);
      expect(result[0].username).toBe('admin');
      expect(result[0]).not.toHaveProperty('encryptedPassword');
    });
  });

  describe('revealPassword', () => {
    it('should throw NotFoundException if credential is not found', async () => {
      mockPrisma.credential.findUnique.mockResolvedValue(null);
      await expect(service.revealPassword('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should decrypt password and write audit log on success', async () => {
      const plaintext = 'MySecretPass';
      const encrypted = service.encrypt(plaintext);
      const mockCred = {
        id: 'cred-1',
        username: 'admin',
        assetId: 'asset-1',
        encryptedPassword: encrypted,
      };

      mockPrisma.credential.findUnique.mockResolvedValue(mockCred);

      const result = await service.revealPassword('cred-1', 'user-1');

      expect(result.password).toBe(plaintext);
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update other fields without encrypting password if password not provided', async () => {
      mockPrisma.credential.update.mockResolvedValue(mockCredentialRecord);

      const result = await service.update('cred-1', { username: 'new-admin' }, 'user-1');

      expect(result.username).toBe('admin');
      expect(mockPrisma.credential.update).toHaveBeenCalled();
    });

    it('should encrypt password and update lastChangedDate if password is provided', async () => {
      mockPrisma.credential.update.mockResolvedValue(mockCredentialRecord);

      await service.update('cred-1', { password: 'new-password' }, 'user-1');

      expect(mockPrisma.credential.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cred-1' },
          data: expect.objectContaining({
            encryptedPassword: expect.any(String),
            lastChangedDate: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if credential is not found', async () => {
      mockPrisma.credential.findUnique.mockResolvedValue(null);
      await expect(service.remove('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should delete record and write audit log on success', async () => {
      mockPrisma.credential.findUnique.mockResolvedValue(mockCredentialRecord);
      mockPrisma.credential.delete.mockResolvedValue(mockCredentialRecord);

      const result = await service.remove('cred-1', 'user-1');

      expect(result.id).toBe('cred-1');
      expect(mockPrisma.credential.delete).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });
});
