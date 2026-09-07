import {
  VmCriticality,
  VmDiscoveryState,
  VmEnvironment,
  VmLifecycleState,
} from '@prisma/client';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { VmService } from './vm.service';

type VmServiceInternals = {
  mapInventory(value: unknown): unknown;
};

type InventoryUpdateArgs = {
  data: Record<string, unknown>;
};

describe('VmService curated context and lifecycle contract', () => {
  it('updates curated context without changing vCenter facts, sync state, lifecycle, or nested relations', async () => {
    const current = {
      id: 'vm-1',
      name: 'vm-from-vcenter',
      moid: 'vm-101',
      systemName: 'APP-PROD-01',
      environment: VmEnvironment.PROD,
      owner: 'old-owner',
      businessUnit: 'Treasury',
      slaTier: 'Gold',
      serviceRole: 'Application Server',
      criticality: VmCriticality.BUSINESS_CRITICAL,
      description: 'Business workload',
      notes: 'keep this note',
      tags: ['prod', 'app'],
      discoveryState: VmDiscoveryState.READY_TO_PROMOTE,
      lifecycleState: VmLifecycleState.DELETED_IN_VCENTER,
      syncState: 'Missing from source',
      lastSyncAt: new Date('2026-09-01T00:00:00Z'),
      disks: [{ label: 'Hard disk 1', sizeGb: 100 }],
      guestAccounts: [{ id: 'account-1', username: 'svc-app' }],
      componentLinks: [{ componentId: 'component-1', relationType: 'PRIMARY' }],
      documentLinks: [{ documentId: 'doc-1' }],
    };
    let capturedUpdate: InventoryUpdateArgs | undefined;
    const inventoryUpdate = jest.fn((args: InventoryUpdateArgs) => {
      capturedUpdate = args;
      return Promise.resolve({
        ...current,
        owner: 'new-owner',
      });
    });
    const prisma = {
      vmInventory: {
        findUnique: jest.fn().mockResolvedValue(current),
        update: inventoryUpdate,
      },
      applicationComponent: {
        count: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaService;
    const service = new VmService(prisma, {} as CredentialsService);
    (service as unknown as VmServiceInternals).mapInventory = (value) => value;

    await service.updateInventory(
      'vm-1',
      {
        owner: 'new-owner',
        lifecycleState: VmLifecycleState.ACTIVE,
      },
      'user-1',
    );

    expect(capturedUpdate).toBeDefined();
    if (!capturedUpdate) throw new Error('Expected VM inventory update call');
    const updateArgs = capturedUpdate;
    expect(updateArgs.data.owner).toBe('new-owner');
    expect(updateArgs.data.notes).toBe('keep this note');
    expect(updateArgs.data.tags).toEqual(['prod', 'app']);
    expect(updateArgs.data).not.toHaveProperty('name');
    expect(updateArgs.data).not.toHaveProperty('moid');
    expect(updateArgs.data).not.toHaveProperty('cluster');
    expect(updateArgs.data).not.toHaveProperty('host');
    expect(updateArgs.data).not.toHaveProperty('guestOs');
    expect(updateArgs.data).not.toHaveProperty('primaryIp');
    expect(updateArgs.data).not.toHaveProperty('cpuCores');
    expect(updateArgs.data).not.toHaveProperty('memoryGb');
    expect(updateArgs.data).not.toHaveProperty('storageGb');
    expect(updateArgs.data).not.toHaveProperty('disks');
    expect(updateArgs.data).not.toHaveProperty('lastSyncAt');
    expect(updateArgs.data).not.toHaveProperty('syncState');
    expect(updateArgs.data).not.toHaveProperty('lifecycleState');
    expect(updateArgs.data).not.toHaveProperty('guestAccounts');
    expect(updateArgs.data).not.toHaveProperty('componentLinks');
    expect(updateArgs.data).not.toHaveProperty('documentLinks');
  });

  it('restores a still-missing VM to DELETED_IN_VCENTER instead of falsely marking it ACTIVE', async () => {
    let capturedRestore: InventoryUpdateArgs | undefined;
    const inventoryUpdate = jest.fn((args: InventoryUpdateArgs) => {
      capturedRestore = args;
      return Promise.resolve({ id: 'vm-1' });
    });
    const prisma = {
      vmInventory: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ syncState: 'Missing from source' }),
        update: inventoryUpdate,
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaService;
    const service = new VmService(prisma, {} as CredentialsService);
    (service as unknown as VmServiceInternals).mapInventory = (value) => value;

    await service.restoreInventory('vm-1', 'user-1');

    expect(capturedRestore).toBeDefined();
    if (!capturedRestore) throw new Error('Expected VM restore update call');
    const updateArgs = capturedRestore;
    expect(updateArgs.data).toEqual({
      lifecycleState: VmLifecycleState.DELETED_IN_VCENTER,
    });
  });
});
