import {
  VmCriticality,
  VmDiscoveryState,
  VmEnvironment,
  VmLifecycleState,
  VmPowerState,
  VmSourceStatus,
  type VmVCenterSource,
} from '@prisma/client';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { VmService } from './vm.service';

type SyncInternals = {
  syncSourceData(source: VmVCenterSource): Promise<{ success: boolean }>;
  fetchSourceInventory(source: VmVCenterSource): Promise<{
    records: Array<Record<string, unknown>>;
    version: string;
  }>;
};

type UpdateManyArgs = {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
};

type UpdateArgs = {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
};

const source: VmVCenterSource = {
  id: 'source-identity',
  name: 'vcenter-identity',
  endpoint: 'https://vcenter.identity.local',
  version: '8.0',
  username: null,
  encryptedPassword: null,
  syncInterval: 15,
  status: VmSourceStatus.HEALTHY,
  lastSyncAt: new Date('2026-09-01T00:00:00Z'),
  notes: null,
  createdByUserId: null,
  createdAt: new Date('2026-09-01T00:00:00Z'),
  updatedAt: new Date('2026-09-01T00:00:00Z'),
};

function syncedRecord() {
  return {
    name: 'vm-stable',
    moid: 'vm-stable-moid',
    cluster: 'cluster-1',
    clusterResolution: 'RESOLVED',
    host: 'esxi-1.local',
    hostResolution: 'RESOLVED',
    computerName: 'VM-STABLE',
    guestOs: 'Ubuntu Linux 64-bit',
    primaryIp: '10.10.10.10',
    cpuCores: 4,
    memoryGb: 16,
    storageGb: 100,
    disks: [{ label: 'Hard disk 1', sizeGb: 100 }],
    networkLabel: 'PROD',
    powerState: VmPowerState.RUNNING,
    environment: VmEnvironment.PROD,
    criticality: VmCriticality.STANDARD,
  };
}

describe('VmService identity and lifecycle preservation', () => {
  it('uses sourceId + MoID as stable discovery identity on repeated sync', async () => {
    const upsertCalls: Array<{ where: unknown }> = [];
    const tx = {
      vmDiscovery: {
        findFirst: jest.fn().mockResolvedValue({
          systemName: 'VM-STABLE',
          environment: VmEnvironment.PROD,
          serviceRole: 'Application Server',
          description: 'Stable VM',
          guestAccountsCount: 1,
          guestAccounts: [{ id: 'account-1' }],
          state: VmDiscoveryState.READY_TO_PROMOTE,
        }),
        upsert: jest.fn((args: { where: unknown }) => {
          upsertCalls.push(args);
          return Promise.resolve({});
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      vmInventory: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      vmVCenterSource: { update: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (transaction: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    } as unknown as PrismaService;
    const service = new VmService(prisma, {} as CredentialsService);
    const internals = service as unknown as SyncInternals;
    internals.fetchSourceInventory = jest
      .fn()
      .mockResolvedValue({ version: '8.0', records: [syncedRecord()] });

    await internals.syncSourceData(source);
    await internals.syncSourceData(source);

    expect(upsertCalls).toHaveLength(2);
    for (const call of upsertCalls) {
      expect(call.where).toEqual({
        sourceId_moid: { sourceId: source.id, moid: 'vm-stable-moid' },
      });
    }
  });

  it('marks a missing VM DELETED_IN_VCENTER without overwriting curated fields or relationships', async () => {
    const inventoryCalls: UpdateManyArgs[] = [];
    const tx = {
      vmDiscovery: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      vmInventory: {
        updateMany: jest.fn((args: UpdateManyArgs) => {
          inventoryCalls.push(args);
          return Promise.resolve({ count: 1 });
        }),
      },
      vmVCenterSource: { update: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (transaction: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    } as unknown as PrismaService;
    const service = new VmService(prisma, {} as CredentialsService);
    const internals = service as unknown as SyncInternals;
    internals.fetchSourceInventory = jest
      .fn()
      .mockResolvedValue({ version: '8.0', records: [] });

    await internals.syncSourceData(source);

    expect(inventoryCalls).toHaveLength(1);
    expect(inventoryCalls[0]?.data).toMatchObject({
      lifecycleState: VmLifecycleState.DELETED_IN_VCENTER,
      syncState: 'Missing from source',
    });
    for (const preservedField of [
      'systemName',
      'environment',
      'owner',
      'businessUnit',
      'criticality',
      'notes',
      'guestAccounts',
      'componentLinks',
      'documentLinks',
    ]) {
      expect(inventoryCalls[0]?.data).not.toHaveProperty(preservedField);
    }
  });

  it('archives by lifecycle flag only and does not delete nested relationships', async () => {
    const updateCalls: UpdateArgs[] = [];
    const prisma = {
      vmInventory: {
        update: jest.fn((args: UpdateArgs) => {
          updateCalls.push(args);
          return Promise.resolve({ id: 'vm-1' });
        }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    } as unknown as PrismaService;
    const service = new VmService(prisma, {} as CredentialsService);

    await service.archiveInventory('vm-1', 'admin-1');

    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]?.data).toEqual({
      lifecycleState: VmLifecycleState.ARCHIVED,
    });
    expect(updateCalls[0]?.data).not.toHaveProperty('guestAccounts');
    expect(updateCalls[0]?.data).not.toHaveProperty('componentLinks');
    expect(updateCalls[0]?.data).not.toHaveProperty('documentLinks');
  });
});
