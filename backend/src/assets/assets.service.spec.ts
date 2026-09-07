import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from './assets.service';

type AssetWhereForTest = {
  OR?: Array<Record<string, unknown>>;
  owner?: { equals: string; mode: string };
  location?: { equals: string; mode: string };
  type?: string;
  status?: string | { not: string };
};

type FindManyArgs = {
  skip: number;
  take: number;
  where: AssetWhereForTest;
  select?: Record<string, unknown>;
  orderBy: Record<string, string>;
};

type CountArgs = {
  where: AssetWhereForTest;
};

describe('AssetsService pagination', () => {
  let capturedFindMany: FindManyArgs | undefined;
  let capturedCount: CountArgs | undefined;

  const findMany = jest.fn((args: FindManyArgs) => {
    capturedFindMany = args;
    return Promise.resolve([
      {
        id: 'asset-1',
        assetId: 'ASSET-001',
        name: 'Server One',
        type: 'SERVER',
        rack: 'R1',
        location: 'Data Center 1',
        status: 'ACTIVE',
        brandModel: 'Example Model',
        sn: 'SN-001',
        parentId: null,
        createdAt: new Date('2026-09-06T00:00:00Z'),
        children: [],
      },
    ]);
  });
  const count = jest.fn((args: CountArgs) => {
    capturedCount = args;
    return Promise.resolve(25);
  });
  const prisma = {
    asset: {
      findMany,
      count,
    },
  } as unknown as PrismaService;
  const credentialsService = {} as CredentialsService;
  let service: AssetsService;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedFindMany = undefined;
    capturedCount = undefined;
    service = new AssetsService(prisma, credentialsService);
  });

  it('queries only the requested page and returns pagination metadata', async () => {
    const result = await service.findAll(2, 10, {
      q: 'server',
      type: 'SERVER',
      status: 'ACTIVE',
      owner: 'db-team',
      location: 'Data Center 1',
      sortBy: 'name',
      sortDir: 'desc',
    });

    expect(capturedFindMany).toMatchObject({
      skip: 10,
      take: 10,
      orderBy: { name: 'desc' },
    });
    expect(capturedCount?.where.OR).toEqual(
      expect.arrayContaining([
        { location: { contains: 'server', mode: 'insensitive' } },
      ]),
    );
    expect(capturedCount?.where).toMatchObject({
      owner: { equals: 'db-team', mode: 'insensitive' },
      location: { equals: 'Data Center 1', mode: 'insensitive' },
      type: 'SERVER',
      status: 'ACTIVE',
    });
    expect(result).toMatchObject({
      total: 25,
      page: 2,
      limit: 10,
      totalPages: 3,
      data: [{ id: 'asset-1' }],
    });
  });

  it('uses an explicit lightweight list projection', async () => {
    await service.findAll(1, 20);

    const select = capturedFindMany?.select;
    expect(select).toBeDefined();
    expect(select).toMatchObject({
      id: true,
      assetId: true,
      name: true,
      type: true,
      rack: true,
      location: true,
      status: true,
      brandModel: true,
      sn: true,
      parentId: true,
    });

    const children = select?.children as
      | { select?: Record<string, unknown> }
      | undefined;
    expect(children?.select).toMatchObject({
      id: true,
      name: true,
      type: true,
    });

    for (const detailOnlyField of [
      'credentials',
      'ipAllocations',
      'notes',
      'attachments',
      'documentLinks',
      'componentLinks',
      'patchInfo',
      'customMetadata',
    ]) {
      expect(select).not.toHaveProperty(detailOnlyField);
    }
  });

  it('caps a requested page size at 200', async () => {
    const result = await service.findAll(1, 1000);

    expect(capturedFindMany?.take).toBe(200);
    expect(result.limit).toBe(200);
  });
});
