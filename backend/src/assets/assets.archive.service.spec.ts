import { AssetStatus, AuditAction } from '@prisma/client';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from './assets.service';

describe('AssetsService archive and restore preservation', () => {
  function makeHarness() {
    const update = jest.fn();
    const auditCreate = jest.fn().mockResolvedValue({});
    const prisma = {
      asset: { update },
      auditLog: { create: auditCreate },
    } as unknown as PrismaService;
    const service = new AssetsService(prisma, {} as CredentialsService);
    return { service, update, auditCreate };
  }

  it('archives by status only and does not delete nested Asset data', async () => {
    const { service, update, auditCreate } = makeHarness();
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'asset-1',
      name: 'server-1',
      type: 'SERVER',
    } as never);
    update.mockResolvedValue({
      id: 'asset-1',
      name: 'server-1',
      type: 'SERVER',
      status: AssetStatus.ARCHIVED,
    });

    await service.remove('asset-1', 'user-1');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'asset-1' },
      data: { status: AssetStatus.ARCHIVED },
    });
    expect(auditCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        action: AuditAction.DELETE_ASSET,
        targetId: 'asset-1',
        details: JSON.stringify({ name: 'server-1', type: 'SERVER' }),
      },
    });
  });

  it('restores by status only and reloads the complete Asset detail', async () => {
    const { service, update, auditCreate } = makeHarness();
    const findOne = jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'asset-1',
      name: 'server-1',
      status: AssetStatus.ACTIVE,
    } as never);
    update.mockResolvedValue({
      id: 'asset-1',
      name: 'server-1',
      status: AssetStatus.ACTIVE,
    });

    await service.restore('asset-1', 'user-1');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'asset-1' },
      data: { status: AssetStatus.ACTIVE },
    });
    expect(findOne).toHaveBeenCalledWith('asset-1');
    expect(auditCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        action: AuditAction.UPDATE_ASSET,
        targetId: 'asset-1',
        details: JSON.stringify({
          name: 'server-1',
          status: AssetStatus.ACTIVE,
          restored: true,
        }),
      },
    });
  });
});
