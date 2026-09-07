import { BadRequestException } from '@nestjs/common';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { DatabasesService } from './databases.service';

type HostIdentity = {
  host: string | null;
  hostAssetId: string | null;
  hostVmId: string | null;
};

type HostContractInternals = {
  validateHostIdentity(input: {
    host?: string | null;
    hostAssetId?: string | null;
    hostVmId?: string | null;
  }): Promise<HostIdentity>;
};

type DatabaseCreateArgs = {
  data: Record<string, unknown>;
};

const projectedDatabase = {
  id: 'db-1',
  name: 'Finance DB',
  engine: 'PostgreSQL',
  version: null,
  environment: null,
  host: null,
  ipAddress: null,
  port: null,
  serviceName: null,
  owner: null,
  backupPolicy: null,
  replication: null,
  linkedApps: [],
  maintenanceWindow: null,
  status: 'ACTIVE',
  note: null,
  responsibleParty: null,
  hostAssetId: null,
  hostVmId: 'vm-1',
  hostAsset: null,
  hostVm: { id: 'vm-1', name: 'vm-db-01', systemName: 'DB01' },
  documentLinks: [],
  accounts: [],
  logicalDatabases: [],
  createdByUser: { id: 'user-1' },
  createdAt: new Date('2026-09-06T00:00:00Z'),
  updatedAt: new Date('2026-09-06T00:00:00Z'),
};

describe('DatabasesService identity and host contract', () => {
  it('allows a Host VM as the compute identity without host text or IP address', async () => {
    const createCalls: DatabaseCreateArgs[] = [];
    const prisma = {
      vmInventory: {
        findUnique: jest.fn().mockResolvedValue({ id: 'vm-1' }),
      },
      asset: {
        findUnique: jest.fn(),
      },
      databaseInventory: {
        create: jest.fn((args: DatabaseCreateArgs) => {
          createCalls.push(args);
          return Promise.resolve(projectedDatabase);
        }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    } as unknown as PrismaService;
    const service = new DatabasesService(prisma, {} as CredentialsService);

    await service.create(
      {
        name: 'Finance DB',
        engine: 'PostgreSQL',
        hostVmId: 'vm-1',
      },
      'user-1',
    );

    expect(createCalls).toHaveLength(1);
    expect(createCalls[0]?.data).toMatchObject({
      name: 'Finance DB',
      engine: 'PostgreSQL',
      host: null,
      hostAssetId: null,
      hostVmId: 'vm-1',
      ipAddress: null,
    });
    expect(createCalls[0]?.data).not.toHaveProperty('accounts');
  });

  it('accepts an existing Host Asset as the compute identity', async () => {
    const prisma = {
      asset: { findUnique: jest.fn().mockResolvedValue({ id: 'asset-1' }) },
      vmInventory: { findUnique: jest.fn() },
    } as unknown as PrismaService;
    const service = new DatabasesService(prisma, {} as CredentialsService);
    const internals = service as unknown as HostContractInternals;

    await expect(
      internals.validateHostIdentity({ hostAssetId: 'asset-1' }),
    ).resolves.toEqual({
      host: null,
      hostAssetId: 'asset-1',
      hostVmId: null,
    });
  });

  it('rejects an Instance with no host or related compute identity', async () => {
    const service = new DatabasesService(
      {} as PrismaService,
      {} as CredentialsService,
    );
    const internals = service as unknown as HostContractInternals;

    await expect(internals.validateHostIdentity({})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects ambiguous Host Asset + Host VM identity', async () => {
    const service = new DatabasesService(
      {} as PrismaService,
      {} as CredentialsService,
    );
    const internals = service as unknown as HostContractInternals;

    await expect(
      internals.validateHostIdentity({
        hostAssetId: 'asset-1',
        hostVmId: 'vm-1',
      }),
    ).rejects.toThrow('Choose either a Host Asset or Host VM, not both.');
  });
});
