import { BadRequestException } from '@nestjs/common';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from './assets.service';

type ComponentLinkWrite = {
  componentId: string;
  relationType: string;
  responsibleParty: string | null;
};

type AssetUpdateArgs = {
  data: {
    componentLinks?: {
      deleteMany: Record<string, never>;
      create: ComponentLinkWrite[];
    };
  };
};

describe('AssetsService application component links', () => {
  const baseAsset = {
    id: 'asset-1',
    name: 'Asset One',
    type: 'SERVER',
    assetId: 'ASSET-1',
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

  function makeHarness(componentCount: number) {
    let capturedUpdate: AssetUpdateArgs | undefined;
    const update = jest.fn((args: AssetUpdateArgs) => {
      capturedUpdate = args;
      return Promise.resolve(baseAsset);
    });
    const count = jest.fn().mockResolvedValue(componentCount);
    const prisma = {
      asset: { findUnique: jest.fn() },
      credential: { findMany: jest.fn() },
      applicationComponent: { count },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(
        (callback: (tx: { asset: { update: typeof update } }) => unknown) =>
          Promise.resolve(callback({ asset: { update } })),
      ),
    } as unknown as PrismaService;

    const service = new AssetsService(prisma, {} as CredentialsService);
    jest.spyOn(service, 'findOne').mockResolvedValue(baseAsset as never);
    return { service, count, getCapturedUpdate: () => capturedUpdate };
  }

  it('persists one PRIMARY relationship plus SHARED relationships', async () => {
    const harness = makeHarness(2);

    await harness.service.update(
      'asset-1',
      {
        componentLinks: [
          {
            componentId: 'component-primary',
            relationType: 'PRIMARY',
            responsibleParty: 'Primary Ops',
          },
          {
            componentId: 'component-shared',
            relationType: 'SHARED',
          },
        ],
      },
      'user-1',
    );

    expect(harness.getCapturedUpdate()?.data.componentLinks?.create).toEqual([
      {
        componentId: 'component-primary',
        relationType: 'PRIMARY',
        responsibleParty: 'Primary Ops',
      },
      {
        componentId: 'component-shared',
        relationType: 'SHARED',
        responsibleParty: null,
      },
    ]);
  });

  it('rejects duplicate component relationships', async () => {
    const harness = makeHarness(1);

    await expect(
      harness.service.update(
        'asset-1',
        {
          componentLinks: [
            { componentId: 'component-1', relationType: 'PRIMARY' },
            { componentId: 'component-1', relationType: 'SHARED' },
          ],
        },
        'user-1',
      ),
    ).rejects.toThrow(
      new BadRequestException('Asset component links must be unique.'),
    );
  });

  it('rejects more than one PRIMARY relationship', async () => {
    const harness = makeHarness(2);

    await expect(
      harness.service.update(
        'asset-1',
        {
          componentLinks: [
            { componentId: 'component-1', relationType: 'PRIMARY' },
            { componentId: 'component-2', relationType: 'PRIMARY' },
          ],
        },
        'user-1',
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'An asset can have at most one PRIMARY application component relationship.',
      ),
    );
  });

  it('rejects unknown component IDs', async () => {
    const harness = makeHarness(1);

    await expect(
      harness.service.update(
        'asset-1',
        {
          componentLinks: [
            { componentId: 'component-1', relationType: 'PRIMARY' },
            { componentId: 'missing-component', relationType: 'SHARED' },
          ],
        },
        'user-1',
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'Asset component links must reference existing application components',
      ),
    );
    expect(harness.count).toHaveBeenCalled();
  });

  it('maps legacy componentIds to one PRIMARY then SHARED links', async () => {
    const harness = makeHarness(2);

    await harness.service.update(
      'asset-1',
      { componentIds: ['component-1', 'component-2'] },
      'user-1',
    );

    expect(harness.getCapturedUpdate()?.data.componentLinks?.create).toEqual([
      {
        componentId: 'component-1',
        relationType: 'PRIMARY',
        responsibleParty: null,
      },
      {
        componentId: 'component-2',
        relationType: 'SHARED',
        responsibleParty: null,
      },
    ]);
  });
});
