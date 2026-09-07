import { DatabaseStatus } from '@prisma/client';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { DatabasesService } from './databases.service';

type FindManyArgs = {
  skip?: number;
  take?: number;
  where?: unknown;
  select?: Record<string, unknown>;
  orderBy?: unknown;
};

describe('DatabasesService list and topology option contract', () => {
  it('uses a paginated lightweight projection for the Database list', async () => {
    const captured: FindManyArgs[] = [];
    const databaseFindMany = jest.fn((args: FindManyArgs) => {
      captured.push(args);
      return Promise.resolve([
        {
          id: 'db-1',
          name: 'Treasury DB',
          engine: 'Oracle',
          version: '19c',
          environment: 'PROD',
          host: null,
          ipAddress: '10.0.0.10',
          port: '1521',
          status: DatabaseStatus.ACTIVE,
          owner: 'DBA Team',
          backupPolicy: 'Daily',
          hostAsset: { id: 'asset-1', name: 'db-host-01', assetId: 'AST-001' },
          hostVm: null,
          _count: { accounts: 2 },
          createdAt: new Date('2026-09-01T00:00:00Z'),
          updatedAt: new Date('2026-09-02T00:00:00Z'),
        },
      ]);
    });
    const databaseCount = jest.fn().mockResolvedValue(1);
    const prisma = {
      databaseInventory: { findMany: databaseFindMany, count: databaseCount },
    } as unknown as PrismaService;
    const service = new DatabasesService(prisma, {} as CredentialsService);

    const result = await service.findAll(2, 20, {
      q: 'Treasury',
      environment: 'PROD',
      sortBy: 'name',
      sortDir: 'asc',
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: 'db-1',
      accountsCount: 2,
      hostAsset: { id: 'asset-1' },
      needsContext: false,
    });
    expect(result).toMatchObject({
      page: 2,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    expect(captured[0]).toMatchObject({ skip: 20, take: 20 });
    expect(captured[0]?.select).toBeDefined();
    expect(captured[0]?.select).not.toHaveProperty('documentLinks');
    expect(captured[0]?.select).not.toHaveProperty('logicalDatabases');
    expect(captured[0]?.select).not.toHaveProperty('accounts');
    expect(captured[0]?.select?._count).toEqual({ select: { accounts: true } });
    expect(databaseCount).toHaveBeenCalled();
  });

  it('uses the same host-identity context reason in Database list and Data Quality summary', async () => {
    const databaseFindMany = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'db-missing-host',
          name: 'Incomplete DB',
          engine: 'PostgreSQL',
          version: '16',
          environment: 'PROD',
          host: null,
          ipAddress: '10.0.0.20',
          port: '5432',
          status: DatabaseStatus.ACTIVE,
          owner: 'DBA Team',
          backupPolicy: 'Daily',
          hostAsset: null,
          hostVm: null,
          _count: { accounts: 1 },
          createdAt: new Date('2026-09-01T00:00:00Z'),
          updatedAt: new Date('2026-09-02T00:00:00Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'db-missing-host',
          name: 'Incomplete DB',
          engine: 'PostgreSQL',
          host: null,
          hostAssetId: null,
          hostVmId: null,
          ipAddress: '10.0.0.20',
          owner: 'DBA Team',
          environment: 'PROD',
          backupPolicy: 'Daily',
          accounts: [{ id: 'account-1' }],
        },
      ]);
    const prisma = {
      databaseInventory: {
        findMany: databaseFindMany,
        count: jest.fn().mockResolvedValue(1),
      },
    } as unknown as PrismaService;
    const service = new DatabasesService(prisma, {} as CredentialsService);

    const list = await service.findAll(1, 20);
    const quality = await service.getDataQualitySummary();

    expect(list.data[0]).toMatchObject({
      needsContext: true,
      contextIssues: ['host identity'],
    });
    expect(quality.issues[0]).toMatchObject({
      id: 'db-missing-host',
      issues: ['host identity'],
    });
  });

  it('returns only active lightweight Logical Database options for Application topology', async () => {
    const captured: FindManyArgs[] = [];
    const logicalFindMany = jest.fn((args: FindManyArgs) => {
      captured.push(args);
      return Promise.resolve([
        {
          id: 'logical-1',
          name: 'billing',
          databaseInventory: { id: 'db-1', name: 'Treasury DB' },
        },
      ]);
    });
    const prisma = {
      logicalDatabase: { findMany: logicalFindMany },
    } as unknown as PrismaService;
    const service = new DatabasesService(prisma, {} as CredentialsService);

    await expect(service.getLogicalDatabaseOptions()).resolves.toEqual([
      {
        id: 'logical-1',
        name: 'billing',
        databaseId: 'db-1',
        databaseName: 'Treasury DB',
        label: 'Treasury DB · billing',
      },
    ]);
    expect(captured[0]?.where).toEqual({
      status: { not: DatabaseStatus.ARCHIVED },
      databaseInventory: { status: { not: DatabaseStatus.ARCHIVED } },
    });
    expect(captured[0]?.select).toEqual({
      id: true,
      name: true,
      databaseInventory: { select: { id: true, name: true } },
    });
  });
});
