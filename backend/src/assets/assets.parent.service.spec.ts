import { BadRequestException } from '@nestjs/common';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from './assets.service';

type AssetUpdateCall = {
  where: { id: string };
  data: { parentId?: string | null };
};

type AssetLookupCall = {
  where: {
    status: { not: string };
    id?: { not: string };
    OR?: Array<Record<string, unknown>>;
  };
  select: Record<string, boolean>;
  take: number;
};

describe('AssetsService parent hierarchy', () => {
  const baseAsset = {
    id: 'asset-child',
    name: 'Child Asset',
    type: 'SERVER',
    assetId: 'ASSET-CHILD',
    parentId: null,
    credentials: [],
    ipAllocations: [],
    documentLinks: [],
    notes: [],
    attachments: [],
    children: [],
    parent: null,
    componentLinks: [],
    patchInfo: null,
  };

  function makeHarness() {
    const parentFindUnique = jest.fn();
    let capturedUpdate: AssetUpdateCall | undefined;
    const txUpdate = jest.fn((args: AssetUpdateCall) => {
      capturedUpdate = args;
      return Promise.resolve({
        ...baseAsset,
        parentId: args.data.parentId ?? null,
      });
    });
    const auditCreate = jest.fn().mockResolvedValue({});
    const transaction = jest.fn(
      (callback: (tx: { asset: { update: typeof txUpdate } }) => unknown) =>
        Promise.resolve(callback({ asset: { update: txUpdate } })),
    );

    const prisma = {
      asset: { findUnique: parentFindUnique },
      credential: { findMany: jest.fn() },
      applicationComponent: { count: jest.fn() },
      auditLog: { create: auditCreate },
      $transaction: transaction,
    } as unknown as PrismaService;

    const service = new AssetsService(prisma, {} as CredentialsService);
    jest.spyOn(service, 'findOne').mockResolvedValue(baseAsset as never);

    return {
      service,
      parentFindUnique,
      transaction,
      getCapturedUpdate: () => capturedUpdate,
    };
  }

  it('accepts a valid parent outside the current list page', async () => {
    const harness = makeHarness();
    harness.parentFindUnique.mockResolvedValue({
      id: 'asset-parent',
      parentId: null,
    });

    await harness.service.update(
      'asset-child',
      { parentId: 'asset-parent' },
      'user-1',
    );

    expect(harness.getCapturedUpdate()?.data.parentId).toBe('asset-parent');
  });

  it('rejects an unknown parent', async () => {
    const harness = makeHarness();
    harness.parentFindUnique.mockResolvedValue(null);

    await expect(
      harness.service.update(
        'asset-child',
        { parentId: 'missing-parent' },
        'user-1',
      ),
    ).rejects.toThrow(new BadRequestException('Parent asset does not exist.'));
    expect(harness.transaction).not.toHaveBeenCalled();
  });

  it('rejects selecting the asset itself as parent', async () => {
    const harness = makeHarness();

    await expect(
      harness.service.update(
        'asset-child',
        { parentId: 'asset-child' },
        'user-1',
      ),
    ).rejects.toThrow(
      new BadRequestException('An asset cannot be its own parent.'),
    );
    expect(harness.parentFindUnique).not.toHaveBeenCalled();
    expect(harness.transaction).not.toHaveBeenCalled();
  });

  it('rejects a parent that would create a hierarchy loop', async () => {
    const harness = makeHarness();
    harness.parentFindUnique.mockResolvedValue({
      id: 'asset-grandchild',
      parentId: 'asset-child',
    });

    await expect(
      harness.service.update(
        'asset-child',
        { parentId: 'asset-grandchild' },
        'user-1',
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'Asset parent selection would create a hierarchy loop.',
      ),
    );
    expect(harness.transaction).not.toHaveBeenCalled();
  });

  it('uses a lightweight searchable projection for parent lookup', async () => {
    let capturedLookup: AssetLookupCall | undefined;
    const findMany = jest.fn((args: AssetLookupCall) => {
      capturedLookup = args;
      return Promise.resolve([
        {
          id: 'asset-parent',
          assetId: 'SW-001',
          name: 'Core Switch',
          type: 'SWITCH',
          location: 'Bangkok DC1',
          parentId: null,
        },
      ]);
    });
    const prisma = {
      asset: { findMany },
    } as unknown as PrismaService;
    const service = new AssetsService(prisma, {} as CredentialsService);

    const result = await service.lookup('core', 25, 'asset-child');

    expect(capturedLookup?.where.status).toEqual({ not: 'ARCHIVED' });
    expect(capturedLookup?.where.id).toEqual({ not: 'asset-child' });
    expect(capturedLookup?.take).toBe(25);
    expect(capturedLookup?.select).toEqual({
      id: true,
      assetId: true,
      name: true,
      type: true,
      location: true,
      parentId: true,
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Core Switch');
  });
});
