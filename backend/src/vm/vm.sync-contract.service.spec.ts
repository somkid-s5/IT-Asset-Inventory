import {
  VmCriticality,
  VmDiscoveryState,
  VmEnvironment,
  VmPowerState,
  VmSourceStatus,
  type VmVCenterSource,
} from '@prisma/client';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { VmService } from './vm.service';

type SyncResult = {
  success: boolean;
  discoveredCount: number;
};

type SyncInternals = {
  syncSourceData(source: VmVCenterSource): Promise<SyncResult>;
  fetchSourceInventory(source: VmVCenterSource): Promise<{
    records: Array<Record<string, unknown>>;
    version: string;
  }>;
};

type UpdateManyArgs = {
  data: Record<string, unknown>;
  where: Record<string, unknown>;
};

const source: VmVCenterSource = {
  id: 'source-1',
  name: 'vcenter-prod',
  endpoint: 'https://vcenter.example.local',
  version: '7.0',
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

describe('VmService vCenter source-of-truth contract', () => {
  it('refreshes all vCenter-owned facts without touching curated context', async () => {
    const inventoryUpdateManyCalls: UpdateManyArgs[] = [];
    const inventoryUpdateMany = jest.fn((args: UpdateManyArgs) => {
      inventoryUpdateManyCalls.push(args);
      return Promise.resolve({ count: 1 });
    });
    const tx = {
      vmDiscovery: {
        findFirst: jest.fn().mockResolvedValue({
          systemName: 'curated-system-name',
          environment: VmEnvironment.PROD,
          serviceRole: 'Application Server',
          description: 'Business workload',
          guestAccountsCount: 1,
          guestAccounts: [{ id: 'account-1' }],
          state: VmDiscoveryState.READY_TO_PROMOTE,
        }),
        upsert: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      vmInventory: {
        updateMany: inventoryUpdateMany,
      },
      vmVCenterSource: {
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (transaction: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    } as unknown as PrismaService;
    const service = new VmService(prisma, {} as CredentialsService);
    const internals = service as unknown as SyncInternals;
    internals.fetchSourceInventory = jest.fn().mockResolvedValue({
      version: '8.0',
      records: [
        {
          name: 'vm-renamed-in-vcenter',
          moid: 'vm-101',
          cluster: 'cluster-new',
          clusterResolution: 'RESOLVED',
          host: 'esxi-new.example.local',
          hostResolution: 'RESOLVED',
          computerName: 'VM-NEW',
          guestOs: 'Ubuntu Linux 64-bit',
          primaryIp: '10.20.30.40',
          cpuCores: 8,
          memoryGb: 32,
          storageGb: 500,
          disks: [{ label: 'Hard disk 1', sizeGb: 500 }],
          networkLabel: 'DVPG-PROD',
          powerState: VmPowerState.RUNNING,
          environment: VmEnvironment.PROD,
          criticality: VmCriticality.BUSINESS_CRITICAL,
        },
      ],
    });

    const result = await internals.syncSourceData(source);

    expect(result.success).toBe(true);
    expect(result.discoveredCount).toBe(1);
    const refreshCall = inventoryUpdateManyCalls[0];
    expect(refreshCall).toBeDefined();
    if (!refreshCall) throw new Error('Expected inventory refresh call');
    expect(refreshCall.data).toMatchObject({
      name: 'vm-renamed-in-vcenter',
      cluster: 'cluster-new',
      host: 'esxi-new.example.local',
      computerName: 'VM-NEW',
      guestOs: 'Ubuntu Linux 64-bit',
      primaryIp: '10.20.30.40',
      cpuCores: 8,
      memoryGb: 32,
      storageGb: 500,
      networkLabel: 'DVPG-PROD',
      powerState: VmPowerState.RUNNING,
      syncState: 'Synced',
    });
    expect(refreshCall.data).toHaveProperty('disks');
    expect(refreshCall.data).toHaveProperty('lastSyncAt');
    for (const curatedField of [
      'systemName',
      'environment',
      'owner',
      'businessUnit',
      'slaTier',
      'serviceRole',
      'criticality',
      'description',
      'notes',
      'tags',
      'guestAccounts',
      'componentLinks',
      'documentLinks',
    ]) {
      expect(refreshCall.data).not.toHaveProperty(curatedField);
    }
  });
});
