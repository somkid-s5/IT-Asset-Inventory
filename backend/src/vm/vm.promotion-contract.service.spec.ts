import {
  VmCriticality,
  VmDiscoveryState,
  VmEnvironment,
  VmLifecycleState,
  VmPowerState,
} from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { VmService } from './vm.service';

type VmServiceInternals = {
  mapInventory(value: unknown): unknown;
};

type InventoryCreateArgs = {
  data: Record<string, unknown> & {
    guestAccounts?: { create: Array<Record<string, unknown>> };
  };
};

type DiscoveryUpdateArgs = {
  data: Record<string, unknown>;
};

const discovery = {
  id: 'discovery-1',
  sourceId: 'source-1',
  source: { id: 'source-1', name: 'vcenter-prod' },
  name: 'vm-from-vcenter',
  systemName: 'APP-PROD-01',
  moid: 'vm-101',
  environment: VmEnvironment.PROD,
  cluster: 'cluster-1',
  clusterResolution: 'RESOLVED',
  host: 'esxi-01.local',
  hostResolution: 'RESOLVED',
  computerName: 'APP-PROD-01',
  guestOs: 'Ubuntu Linux 64-bit',
  primaryIp: '10.0.0.21',
  cpuCores: 4,
  memoryGb: 16,
  storageGb: 200,
  disks: [{ label: 'Hard disk 1', sizeGb: 200 }],
  networkLabel: 'DVPG-PROD',
  powerState: VmPowerState.RUNNING,
  state: VmDiscoveryState.READY_TO_PROMOTE,
  completeness: 100,
  missingFields: [],
  lastSeenAt: new Date('2026-09-05T10:00:00Z'),
  tags: ['linux', 'app'],
  guestAccountsCount: 1,
  owner: 'platform-team',
  businessUnit: 'Treasury',
  slaTier: 'Gold',
  serviceRole: 'Application Server',
  criticality: VmCriticality.BUSINESS_CRITICAL,
  description: 'Treasury application runtime',
  notes: 'Curated discovery note',
  guestAccounts: [
    {
      id: 'guest-1',
      username: 'svc-app',
      encryptedPassword: 'encrypted-secret',
      accessMethod: 'SSH',
      role: 'service',
      note: 'runtime account',
    },
  ],
};

describe('VmService lossless promotion contract', () => {
  it('rejects re-promotion instead of deleting and recreating an existing Inventory VM', async () => {
    const inventoryCreate = jest.fn();
    const tx = {
      vmDiscovery: {
        findUnique: jest.fn().mockResolvedValue(discovery),
      },
      vmInventory: {
        findUnique: jest.fn().mockResolvedValue({ id: 'inventory-existing' }),
        create: inventoryCreate,
      },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (transaction: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    } as unknown as PrismaService;
    const service = new VmService(prisma, {} as CredentialsService);

    await expect(
      service.promoteDiscovery(discovery.id, {}, 'user-1'),
    ).rejects.toThrow(BadRequestException);
    expect(inventoryCreate).not.toHaveBeenCalled();
  });

  it('promotes a partial request without losing curated Discovery context or guest secrets', async () => {
    let capturedInventoryCreate: InventoryCreateArgs | undefined;
    let capturedDiscoveryUpdate: DiscoveryUpdateArgs | undefined;
    const tx = {
      vmDiscovery: {
        findUnique: jest.fn().mockResolvedValue(discovery),
        update: jest.fn((args: DiscoveryUpdateArgs) => {
          capturedDiscoveryUpdate = args;
          return Promise.resolve({});
        }),
      },
      vmInventory: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn((args: InventoryCreateArgs) => {
          capturedInventoryCreate = args;
          return Promise.resolve({
            id: 'inventory-1',
            name: discovery.name,
            moid: discovery.moid,
          });
        }),
      },
      applicationComponent: {
        count: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (transaction: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    } as unknown as PrismaService;
    const service = new VmService(prisma, {} as CredentialsService);
    (service as unknown as VmServiceInternals).mapInventory = (value) => value;

    await service.promoteDiscovery(discovery.id, {}, 'user-1');

    expect(capturedInventoryCreate).toBeDefined();
    if (!capturedInventoryCreate) throw new Error('Expected Inventory create');
    const data = capturedInventoryCreate.data;
    expect(data).toMatchObject({
      owner: 'platform-team',
      businessUnit: 'Treasury',
      slaTier: 'Gold',
      serviceRole: 'Application Server',
      criticality: VmCriticality.BUSINESS_CRITICAL,
      description: 'Treasury application runtime',
      notes: 'Curated discovery note',
      tags: ['linux', 'app'],
      lifecycleState: VmLifecycleState.ACTIVE,
      discoveryState: VmDiscoveryState.NEEDS_CONTEXT,
      lastSyncAt: discovery.lastSeenAt,
      disks: discovery.disks,
    });
    expect(data.guestAccounts?.create).toEqual([
      {
        username: 'svc-app',
        encryptedPassword: 'encrypted-secret',
        accessMethod: 'SSH',
        role: 'service',
        note: 'runtime account',
      },
    ]);

    expect(capturedDiscoveryUpdate).toBeDefined();
    if (!capturedDiscoveryUpdate) throw new Error('Expected Discovery update');
    expect(capturedDiscoveryUpdate.data).not.toHaveProperty('createdByUserId');
    expect(capturedDiscoveryUpdate.data).not.toHaveProperty('guestAccounts');
  });
});
