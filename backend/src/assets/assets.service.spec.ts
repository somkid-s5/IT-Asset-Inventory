import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from './assets.service';

describe('AssetsService pagination', () => {
  type CountArgs = {
    where: {
      OR: Array<{ location: { contains: string; mode: string } }>;
    };
  };
  const findMany = jest.fn();
  const count = jest.fn();
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
    service = new AssetsService(prisma, credentialsService);
    findMany.mockResolvedValue([
      {
        id: 'asset-1',
        credentials: [],
        ipAllocations: [],
        notes: [],
        attachments: [],
        children: [],
        parent: null,
      },
    ]);
    count.mockResolvedValue(25);
  });

  it('queries only the requested page and returns pagination metadata', async () => {
    const result = await service.findAll(2, 10, {
      q: 'server',
      sortBy: 'name',
      sortDir: 'desc',
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        orderBy: { name: 'desc' },
      }),
    );
    expect(count).toHaveBeenCalled();
    const [[countArgs]] = count.mock.calls as unknown as [[CountArgs]];
    expect(countArgs.where.OR).toEqual(
      expect.arrayContaining([
        { location: { contains: 'server', mode: 'insensitive' } },
      ]),
    );
    expect(result).toMatchObject({
      total: 25,
      page: 2,
      limit: 10,
      totalPages: 3,
      data: [{ id: 'asset-1' }],
    });
  });

  it('caps a requested page size at 200', async () => {
    const result = await service.findAll(1, 1000);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 }),
    );
    expect(result.limit).toBe(200);
  });
});
