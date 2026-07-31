import { PrismaService } from './prisma/prisma.service';
import { AppService } from './app.service';

describe('AppService health checks', () => {
  let service: AppService;
  const prisma = {
    $queryRaw: jest.fn(),
  };

  beforeEach(() => {
    service = new AppService(prisma as unknown as PrismaService);
    jest.clearAllMocks();
  });

  it('reports liveness without checking the database', () => {
    expect(service.getLiveness().status).toBe('ok');
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('reports readiness when the database query succeeds', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    await expect(service.getReadiness()).resolves.toMatchObject({
      status: 'ok',
      ready: true,
      dependencies: { database: { status: 'ok' } },
    });
  });

  it('reports not_ready when the database query fails', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('database unavailable'));

    await expect(service.getReadiness()).resolves.toMatchObject({
      status: 'not_ready',
      ready: false,
      dependencies: { database: { status: 'unavailable' } },
    });
  });
});
