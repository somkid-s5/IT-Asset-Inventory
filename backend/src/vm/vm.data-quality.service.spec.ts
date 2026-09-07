import { VmCriticality, VmLifecycleState } from '@prisma/client';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { VmService } from './vm.service';

describe('VmService VM Data Quality contract', () => {
  it('reports missing Application context for an Inventory VM', async () => {
    const prisma = {
      vmDiscovery: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      vmInventory: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'vm-1',
            name: 'app-prod-01',
            syncState: 'Synced',
            lifecycleState: VmLifecycleState.ACTIVE,
            owner: 'platform-team',
            businessUnit: 'Treasury',
            serviceRole: 'Application Server',
            criticality: VmCriticality.BUSINESS_CRITICAL,
            componentLinks: [],
          },
        ]),
      },
    } as unknown as PrismaService;
    const service = new VmService(prisma, {} as CredentialsService);

    const summary = await service.getDataQualitySummary();

    expect(summary.issueCount).toBe(1);
    expect(summary.issues[0]).toMatchObject({
      id: 'vm-1',
      kind: 'inventory',
      issues: ['application component'],
    });
  });

  it('keeps missing-from-source separate from VM context completeness', async () => {
    const prisma = {
      vmDiscovery: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      vmInventory: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'vm-missing',
            name: 'legacy-vm',
            syncState: 'Missing from source',
            lifecycleState: VmLifecycleState.DELETED_IN_VCENTER,
            owner: 'platform-team',
            businessUnit: 'Treasury',
            serviceRole: 'Application Server',
            criticality: VmCriticality.BUSINESS_CRITICAL,
            componentLinks: [{ id: 'link-1' }],
          },
        ]),
      },
    } as unknown as PrismaService;
    const service = new VmService(prisma, {} as CredentialsService);

    const summary = await service.getDataQualitySummary();

    expect(summary.issueCount).toBe(0);
    expect(summary.operationalIssueCount).toBe(1);
    expect(summary.operationalIssues[0]).toMatchObject({
      id: 'vm-missing',
      issues: ['Deleted in vCenter'],
    });
  });

  it('clears the Application issue once a component relationship exists', async () => {
    const prisma = {
      vmDiscovery: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      vmInventory: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'vm-1',
            name: 'app-prod-01',
            syncState: 'Synced',
            lifecycleState: VmLifecycleState.ACTIVE,
            owner: 'platform-team',
            businessUnit: 'Treasury',
            serviceRole: 'Application Server',
            criticality: VmCriticality.BUSINESS_CRITICAL,
            componentLinks: [{ id: 'link-1' }],
          },
        ]),
      },
    } as unknown as PrismaService;
    const service = new VmService(prisma, {} as CredentialsService);

    const summary = await service.getDataQualitySummary();

    expect(summary.issueCount).toBe(0);
  });
});
