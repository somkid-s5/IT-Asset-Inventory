import { BadRequestException } from '@nestjs/common';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from './assets.service';

type AssetWriteArgs = {
  data: {
    assetId?: string | null;
    sn?: string | null;
  };
};

const detailShape = {
  id: 'asset-1',
  name: 'server-1',
  assetId: null,
  sn: null,
  type: 'SERVER',
  patchInfo: null,
  ipAllocations: [],
  parent: null,
  children: [],
  credentials: [],
  componentLinks: [],
  documentLinks: [],
  notes: [],
  attachments: [],
};

describe('AssetsService optional identity uniqueness', () => {
  const credentialsService = {
    encrypt: jest.fn((value: string) => `enc:${value}`),
  } as unknown as CredentialsService;

  function makeCreateHarness() {
    let capturedCreate: AssetWriteArgs | undefined;
    const assetCreate = jest.fn((args: AssetWriteArgs) => {
      capturedCreate = args;
      return Promise.resolve(detailShape);
    });
    const tx = {
      asset: { create: assetCreate },
      iPAllocation: { findMany: jest.fn() },
      iPAllocationCredential: { createMany: jest.fn() },
    };
    const assetFindFirst = jest.fn();
    const prisma = {
      asset: { findFirst: assetFindFirst },
      credential: { count: jest.fn() },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    } as unknown as PrismaService;
    return {
      service: new AssetsService(prisma, credentialsService),
      assetFindFirst,
      getCapturedCreate: () => capturedCreate,
    };
  }

  it('rejects a duplicate Asset ID with a readable error', async () => {
    const { service, assetFindFirst } = makeCreateHarness();
    assetFindFirst.mockResolvedValue({ assetId: 'ASSET-100', sn: null });

    await expect(
      service.create(
        { name: 'server-1', type: 'SERVER', assetId: ' ASSET-100 ' },
        'user-1',
      ),
    ).rejects.toThrow(
      new BadRequestException('Asset ID ASSET-100 is already in use.'),
    );
  });

  it('rejects a duplicate Serial Number with a readable error', async () => {
    const { service, assetFindFirst } = makeCreateHarness();
    assetFindFirst.mockResolvedValue({ assetId: null, sn: 'SN-ABC' });

    await expect(
      service.create(
        { name: 'server-1', type: 'SERVER', sn: ' SN-ABC ' },
        'user-1',
      ),
    ).rejects.toThrow(
      new BadRequestException('Serial Number SN-ABC is already in use.'),
    );
  });

  it('normalizes blank optional identifiers to null', async () => {
    const { service, assetFindFirst, getCapturedCreate } = makeCreateHarness();
    assetFindFirst.mockResolvedValue(null);

    await service.create(
      { name: 'server-1', type: 'SERVER', assetId: '   ', sn: '  ' },
      'user-1',
    );

    expect(getCapturedCreate()?.data).toMatchObject({
      assetId: null,
      sn: null,
    });
  });

  it('allows an update when the same identifiers belong to the current record', async () => {
    let capturedUpdate: AssetWriteArgs | undefined;
    const assetFindFirst = jest.fn().mockResolvedValue(null);
    const tx = {
      asset: {
        update: jest.fn((args: AssetWriteArgs) => {
          capturedUpdate = args;
          return Promise.resolve({
            ...detailShape,
            assetId: 'ASSET-100',
            sn: 'SN-ABC',
          });
        }),
      },
      iPAllocationCredential: { createMany: jest.fn() },
      iPAllocation: { findMany: jest.fn() },
    };
    const prisma = {
      asset: { findFirst: assetFindFirst },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    } as unknown as PrismaService;
    const service = new AssetsService(prisma, credentialsService);
    jest.spyOn(service, 'findOne').mockResolvedValue(detailShape as never);

    await service.update(
      'asset-1',
      { assetId: ' ASSET-100 ', sn: ' SN-ABC ' },
      'user-1',
    );

    expect(assetFindFirst).toHaveBeenCalled();
    expect(capturedUpdate?.data).toMatchObject({
      assetId: 'ASSET-100',
      sn: 'SN-ABC',
    });
  });
});
