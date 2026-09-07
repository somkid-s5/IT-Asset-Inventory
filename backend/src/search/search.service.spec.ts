import { AssetStatus, DatabaseStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from './search.service';

type FindManyArgs = {
  where?: unknown;
  select?: Record<string, unknown>;
  take?: number;
};

describe('SearchService safe global-search contract', () => {
  const createHarness = () => {
    const captures: Record<string, FindManyArgs[]> = {
      applications: [],
      assets: [],
      virtualMachines: [],
      databases: [],
      logicalDatabases: [],
      documents: [],
    };

    const capture =
      (
        key: keyof typeof captures,
        result: unknown[],
      ): ((args: FindManyArgs) => Promise<unknown[]>) =>
      (args) => {
        captures[key].push(args);
        return Promise.resolve(result);
      };

    const prisma = {
      application: {
        findMany: jest.fn(
          capture('applications', [
            {
              id: 'app-1',
              name: 'Treasury Registry',
              technicalOwner: 'Application Operations',
              businessUnit: 'Treasury',
            },
          ]),
        ),
      },
      asset: {
        findMany: jest.fn(
          capture('assets', [
            {
              id: 'asset-1',
              name: 'db-host-01',
              assetId: 'AST-001',
              sn: 'SN-001',
              type: 'SERVER',
              location: 'Bangkok DC1',
              ipAllocations: [{ address: '10.0.0.10' }],
            },
          ]),
        ),
      },
      vmInventory: {
        findMany: jest.fn(
          capture('virtualMachines', [
            {
              id: 'vm-1',
              name: 'vm-prod-01',
              systemName: 'VM-PROD-01',
              primaryIp: '10.0.0.20',
              host: 'esxi-01',
            },
          ]),
        ),
      },
      databaseInventory: {
        findMany: jest.fn(
          capture('databases', [
            {
              id: 'db-1',
              name: 'Treasury Registry DB',
              engine: 'Oracle',
              host: null,
              ipAddress: '10.0.0.30',
              serviceName: 'TRREG',
              hostAsset: { name: 'db-host-01', assetId: 'AST-001' },
              hostVm: null,
            },
          ]),
        ),
      },
      logicalDatabase: {
        findMany: jest.fn(
          capture('logicalDatabases', [
            {
              id: 'logical-1',
              name: 'registry',
              databaseInventory: {
                id: 'db-1',
                name: 'Treasury Registry DB',
                engine: 'Oracle',
              },
            },
          ]),
        ),
      },
      knowledgeDocument: {
        findMany: jest.fn(
          capture('documents', [
            {
              id: 'doc-1',
              title: 'Getting Started',
              category: { name: 'Operations' },
            },
          ]),
        ),
      },
    } as unknown as PrismaService;

    return { service: new SearchService(prisma), captures };
  };

  it('returns distinct safe result groups and excludes archived inventory by contract', async () => {
    const { service, captures } = createHarness();

    const result = await service.search('registry');

    expect(result.logicalDatabases).toHaveLength(1);
    expect(result.logicalDatabases[0]?.id).toBe('logical-1');
    expect(result.logicalDatabases[0]?.name).toBe('registry');
    expect(result.logicalDatabases[0]?.databaseInventory.id).toBe('db-1');

    expect(JSON.stringify(captures.assets[0]?.where)).toContain(
      `"not":"${AssetStatus.ARCHIVED}"`,
    );
    expect(JSON.stringify(captures.databases[0]?.where)).toContain(
      `"not":"${DatabaseStatus.ARCHIVED}"`,
    );
    expect(JSON.stringify(captures.logicalDatabases[0]?.where)).toContain(
      `"not":"${DatabaseStatus.ARCHIVED}"`,
    );

    const projections = JSON.stringify(
      Object.values(captures).map((entries) => entries[0]?.select ?? {}),
    );
    expect(projections).not.toMatch(
      /password|credential|username|token|encrypted|account/i,
    );
  });

  it('searches the accepted safe identifiers without returning their secret neighbors', async () => {
    const { service, captures } = createHarness();

    await service.search('10.0.0.10');

    const assetContract = JSON.stringify(captures.assets[0]);
    expect(assetContract).toContain('assetId');
    expect(assetContract).toContain('sn');
    expect(assetContract).toContain('ipAllocations');

    const vmContract = JSON.stringify(captures.virtualMachines[0]);
    expect(vmContract).toContain('systemName');
    expect(vmContract).toContain('primaryIp');
    expect(vmContract).toContain('host');

    const databaseContract = JSON.stringify(captures.databases[0]);
    expect(databaseContract).toContain('serviceName');
    expect(databaseContract).toContain('hostAsset');
    expect(databaseContract).toContain('hostVm');

    const documentContract = JSON.stringify(captures.documents[0]);
    expect(documentContract).toContain('title');
    expect(documentContract).toContain('content');
  });

  it('does not enumerate inventory for an empty query', async () => {
    const { service, captures } = createHarness();

    await expect(service.search('   ')).resolves.toEqual({
      applications: [],
      assets: [],
      virtualMachines: [],
      databases: [],
      logicalDatabases: [],
      documents: [],
    });
    expect(Object.values(captures).flat()).toHaveLength(0);
  });
});
