import { VmCriticality, VmDiscoveryState, VmEnvironment } from '@prisma/client';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { VmService } from './vm.service';

type VmServiceInternals = {
  mapDiscovery(value: unknown): unknown;
};

type DiscoveryUpdateArgs = {
  data: Record<string, unknown>;
};

describe('VmService Discovery curation contract', () => {
  it('patches curated context without overwriting source facts or clearing saved guest accounts', async () => {
    let capturedUpdate: DiscoveryUpdateArgs | undefined;
    const current = {
      id: 'discovery-1',
      state: VmDiscoveryState.READY_TO_PROMOTE,
      systemName: 'APP-PROD-01',
      environment: VmEnvironment.PROD,
      owner: 'old-owner',
      businessUnit: 'Treasury',
      slaTier: 'Gold',
      serviceRole: 'Application Server',
      criticality: VmCriticality.BUSINESS_CRITICAL,
      description: 'Business workload',
      notes: 'keep note',
      tags: ['prod'],
      guestAccountsCount: 1,
      guestAccounts: [{ id: 'guest-1', username: 'svc-app' }],
    };
    const prisma = {
      vmDiscovery: {
        findUnique: jest.fn().mockResolvedValue(current),
        update: jest.fn((args: DiscoveryUpdateArgs) => {
          capturedUpdate = args;
          return Promise.resolve({ ...current, owner: 'new-owner' });
        }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaService;
    const service = new VmService(prisma, {} as CredentialsService);
    (service as unknown as VmServiceInternals).mapDiscovery = (value) => value;

    await service.updateDiscovery(
      'discovery-1',
      { owner: 'new-owner' },
      'user-1',
    );

    expect(capturedUpdate).toBeDefined();
    if (!capturedUpdate) throw new Error('Expected Discovery update');
    expect(capturedUpdate.data.owner).toBe('new-owner');
    expect(capturedUpdate.data).not.toHaveProperty('name');
    expect(capturedUpdate.data).not.toHaveProperty('moid');
    expect(capturedUpdate.data).not.toHaveProperty('cluster');
    expect(capturedUpdate.data).not.toHaveProperty('host');
    expect(capturedUpdate.data).not.toHaveProperty('guestOs');
    expect(capturedUpdate.data).not.toHaveProperty('primaryIp');
    expect(capturedUpdate.data).not.toHaveProperty('cpuCores');
    expect(capturedUpdate.data).not.toHaveProperty('memoryGb');
    expect(capturedUpdate.data).not.toHaveProperty('storageGb');
    expect(capturedUpdate.data).not.toHaveProperty('disks');
    expect(capturedUpdate.data).not.toHaveProperty('lastSeenAt');
    expect(capturedUpdate.data).not.toHaveProperty('guestAccounts');
    expect(capturedUpdate.data).not.toHaveProperty('createdByUserId');
  });
});
