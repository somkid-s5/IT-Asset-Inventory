import { BadRequestException } from '@nestjs/common';
import {
  VmDiscoveryState,
  VmEnvironment,
  VmLifecycleState,
  VmPowerState,
} from '@prisma/client';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { VmService } from './vm.service';

type FindManyArgs = {
  skip?: number;
  take?: number;
  where?: unknown;
  select?: Record<string, unknown>;
  orderBy?: unknown;
};

describe('VmService server-side list contract', () => {
  it('searches and paginates inventory with a lightweight projection and server view counts', async () => {
    const captured: FindManyArgs[] = [];
    const inventoryFindMany = jest.fn((args: FindManyArgs) => {
      captured.push(args);
      return Promise.resolve([
        {
          id: 'vm-1001',
          name: 'vm-1001',
          systemName: 'PAYMENTS-PROD-1001',
          moid: 'moid-1001',
          environment: VmEnvironment.PROD,
          cluster: 'cluster-prod',
          clusterResolution: 'DIRECT_VM',
          host: 'esxi-01',
          hostResolution: 'DIRECT_VM',
          computerName: 'PAYMENTS-PROD-1001',
          guestOs: 'Ubuntu Linux',
          primaryIp: '10.0.10.1',
          cpuCores: 8,
          memoryGb: 32,
          storageGb: 200,
          disks: [],
          networkLabel: 'prod-network',
          powerState: VmPowerState.RUNNING,
          lifecycleState: VmLifecycleState.ACTIVE,
          discoveryState: VmDiscoveryState.READY_TO_PROMOTE,
          syncState: 'Synced',
          owner: 'Platform',
          businessUnit: 'Finance',
          slaTier: 'Gold',
          serviceRole: 'Application Server',
          criticality: 'BUSINESS_CRITICAL',
          description: 'Dense fixture boundary VM',
          tags: ['dense'],
          lastSyncAt: new Date('2026-09-08T00:00:00Z'),
          syncedFields: ['name'],
          source: { id: 'source-1', name: 'vc-prod-01', version: '8.0' },
          _count: { guestAccounts: 3, componentLinks: 1 },
          updatedAt: new Date('2026-09-08T00:00:00Z'),
        },
      ]);
    });
    const inventoryCount = jest
      .fn()
      .mockResolvedValue(1)
      .mockResolvedValueOnce(1021)
      .mockResolvedValueOnce(901)
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(71);
    const discoveryCount = jest.fn().mockResolvedValue(2);
    const prisma = {
      vmInventory: { findMany: inventoryFindMany, count: inventoryCount },
      vmDiscovery: { count: discoveryCount },
    } as unknown as PrismaService;
    const service = new VmService(prisma, {} as CredentialsService);

    const result = await service.findInventory(51, 20, {
      view: 'ACTIVE',
      environment: 'PROD',
      sourceId: 'source-1',
      sortBy: 'systemName',
      sortDir: 'asc',
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: 'vm-1001',
      systemName: 'PAYMENTS-PROD-1001',
      guestAccountsCount: 3,
    });
    expect(result).toMatchObject({
      page: 51,
      limit: 20,
      total: 1021,
      totalPages: 52,
      hasMore: true,
      viewCounts: {
        active: 901,
        pending: 2,
        orphaned: 50,
        archived: 71,
      },
    });
    expect(captured[0]).toMatchObject({ skip: 1000, take: 20 });
    expect(captured[0]?.select).toBeDefined();
    expect(captured[0]?.select).not.toHaveProperty('guestAccounts');
    expect(captured[0]?.select).not.toHaveProperty('componentLinks');
    expect(captured[0]?.select).not.toHaveProperty('documentLinks');
    expect(captured[0]?.select?._count).toEqual({
      select: { guestAccounts: true, componentLinks: true },
    });

    const searched = await service.findInventory(1, 20, {
      q: 'vm-1001',
      view: 'ACTIVE',
      environment: 'PROD',
      sourceId: 'source-1',
    });
    expect(searched.data[0]?.id).toBe('vm-1001');
    expect(JSON.stringify(captured[1]?.where)).toContain(
      '"name":{"contains":"vm-1001","mode":"insensitive"}',
    );
  });

  it('searches and paginates discovery without loading guest account secrets', async () => {
    const captured: FindManyArgs[] = [];
    const discoveryFindMany = jest.fn((args: FindManyArgs) => {
      captured.push(args);
      return Promise.resolve([
        {
          id: 'discovery-1001',
          name: 'vm-discovery-1001',
          systemName: null,
          moid: 'moid-1001',
          cluster: 'cluster-test',
          clusterResolution: 'UNKNOWN',
          host: 'esxi-test-01',
          hostResolution: 'UNKNOWN',
          computerName: null,
          guestOs: 'Ubuntu Linux',
          primaryIp: '10.0.20.1',
          cpuCores: 4,
          memoryGb: 16,
          storageGb: 100,
          disks: [],
          networkLabel: 'test-network',
          powerState: VmPowerState.STOPPED,
          state: VmDiscoveryState.READY_TO_PROMOTE,
          completeness: 80,
          missingFields: [],
          lastSeenAt: new Date('2026-09-08T00:00:00Z'),
          tags: [],
          owner: null,
          environment: VmEnvironment.TEST,
          businessUnit: null,
          slaTier: null,
          serviceRole: null,
          criticality: null,
          description: null,
          notes: null,
          suggestedOwner: null,
          suggestedEnvironment: null,
          suggestedServiceRole: null,
          suggestedCriticality: null,
          source: { id: 'source-2', name: 'vc-test-01', version: '8.0' },
          _count: { guestAccounts: 0 },
          updatedAt: new Date('2026-09-08T00:00:00Z'),
        },
      ]);
    });
    const discoveryCount = jest.fn().mockResolvedValue(1);
    const inventoryCount = jest.fn().mockResolvedValue(0);
    const prisma = {
      vmDiscovery: { findMany: discoveryFindMany, count: discoveryCount },
      vmInventory: { count: inventoryCount },
    } as unknown as PrismaService;
    const service = new VmService(prisma, {} as CredentialsService);

    const result = await service.findDiscoveries(51, 20, {
      q: 'vm-discovery-1001',
      state: 'READY_TO_PROMOTE',
      sourceId: 'source-2',
      sortBy: 'name',
      sortDir: 'asc',
    });

    expect(result.data).toHaveLength(1);
    expect(result).toMatchObject({
      page: 51,
      limit: 20,
      total: 1,
      totalPages: 1,
      hasMore: false,
    });
    expect(captured[0]).toMatchObject({ skip: 1000, take: 20 });
    expect(captured[0]?.select).toBeDefined();
    expect(captured[0]?.select).not.toHaveProperty('guestAccounts');
    expect(captured[0]?.select).not.toHaveProperty('encryptedPassword');
  });

  it('caps an oversized page limit instead of creating an unbounded query', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      vmInventory: {
        findMany,
        count: jest.fn().mockResolvedValue(0),
      },
      vmDiscovery: { count: jest.fn().mockResolvedValue(0) },
    } as unknown as PrismaService;
    const service = new VmService(prisma, {} as CredentialsService);

    const result = await service.findInventory(1, 1000);

    expect(result.limit).toBe(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 200 }),
    );
  });

  it.each([
    ['page', 0, 20],
    ['limit', 1, 0],
    ['page', Number.NaN, 20],
  ])('rejects invalid %s paging parameters', async (_name, page, limit) => {
    const service = new VmService(
      {} as PrismaService,
      {} as CredentialsService,
    );

    await expect(service.findInventory(page, limit)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
