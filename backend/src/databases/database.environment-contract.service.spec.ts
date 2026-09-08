import { BadRequestException } from '@nestjs/common';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { DatabasesService } from './databases.service';

type EnvironmentInternals = {
  normalizeEnvironment(
    value?: string | null,
    existing?: string | null,
  ): string | null;
};

describe('DatabasesService environment contract', () => {
  const service = new DatabasesService(
    {} as PrismaService,
    {} as CredentialsService,
  ) as unknown as EnvironmentInternals;

  it('normalizes V1 operational environments', () => {
    expect(service.normalizeEnvironment('prod')).toBe('PROD');
    expect(service.normalizeEnvironment(' UAT ')).toBe('UAT');
    expect(service.normalizeEnvironment('test')).toBe('TEST');
  });

  it('rejects a new legacy or unsupported environment', () => {
    expect(() => service.normalizeEnvironment('DEV')).toThrow(
      BadRequestException,
    );
    expect(() => service.normalizeEnvironment('DR')).toThrow(
      'Database environment must be one of PROD, UAT, or TEST.',
    );
  });

  it('preserves an unchanged legacy environment during edit until migration is explicit', () => {
    expect(service.normalizeEnvironment('DEV', 'DEV')).toBe('DEV');
  });

  it('rejects a Database environment that differs from its Host VM environment', async () => {
    const prisma = {
      vmInventory: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'vm-uat',
          environment: 'UAT',
          lifecycleState: 'ACTIVE',
        }),
      },
    } as unknown as PrismaService;
    const databases = new DatabasesService(prisma, {} as CredentialsService);
    const internals = databases as unknown as {
      validateHostIdentity(input: {
        hostVmId: string;
        environment: string;
      }): Promise<unknown>;
    };

    await expect(
      internals.validateHostIdentity({
        hostVmId: 'vm-uat',
        environment: 'PROD',
      }),
    ).rejects.toThrow(
      'Database environment PROD must match Host VM environment UAT.',
    );
  });

  it('rejects an archived Host VM as a new Database relationship', async () => {
    const prisma = {
      vmInventory: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'vm-archived',
          environment: 'PROD',
          lifecycleState: 'ARCHIVED',
        }),
      },
    } as unknown as PrismaService;
    const databases = new DatabasesService(prisma, {} as CredentialsService);
    const internals = databases as unknown as {
      validateHostIdentity(input: {
        hostVmId: string;
        environment: string;
      }): Promise<unknown>;
    };

    await expect(
      internals.validateHostIdentity({
        hostVmId: 'vm-archived',
        environment: 'PROD',
      }),
    ).rejects.toThrow('Archived Host VM vm-archived cannot be newly selected.');
  });

  it('rejects an unknown Database environment when the Host VM has a known environment', async () => {
    const prisma = {
      vmInventory: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'vm-prod',
          environment: 'PROD',
          lifecycleState: 'ACTIVE',
        }),
      },
    } as unknown as PrismaService;
    const databases = new DatabasesService(prisma, {} as CredentialsService);
    const internals = databases as unknown as {
      validateHostIdentity(input: { hostVmId: string }): Promise<unknown>;
    };

    await expect(
      internals.validateHostIdentity({ hostVmId: 'vm-prod' }),
    ).rejects.toThrow(
      'Database environment Unknown must match Host VM environment PROD.',
    );
  });
});
