import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from './assets.service';

type UpdateCall = {
  where: { id: string };
  data: {
    owner?: string;
    department?: string;
    responsibleParty?: string;
    vendor?: string;
  };
};

type AuditCall = {
  data: {
    userId?: string;
    targetId?: string;
  };
};

describe('AssetsService governance context', () => {
  it('persists governance fields through the normal asset update path', async () => {
    const existingAsset = {
      id: 'asset-1',
      name: 'Core Switch',
      type: 'SWITCH',
      assetId: 'SW-001',
      owner: null,
      department: null,
      responsibleParty: null,
      vendor: null,
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

    const updatedAsset = {
      ...existingAsset,
      owner: 'Infrastructure Team',
      department: 'IT Operations',
      responsibleParty: 'On-call SysAdmin',
      vendor: 'Example Vendor',
    };

    let capturedUpdate: UpdateCall | undefined;
    let capturedAudit: AuditCall | undefined;

    const findUnique = jest.fn().mockResolvedValue(existingAsset);
    const update = jest.fn((args: UpdateCall) => {
      capturedUpdate = args;
      return Promise.resolve(updatedAsset);
    });
    const auditCreate = jest.fn((args: AuditCall) => {
      capturedAudit = args;
      return Promise.resolve({});
    });

    const prisma = {
      asset: { findUnique },
      credential: { findMany: jest.fn() },
      applicationComponent: { count: jest.fn() },
      auditLog: { create: auditCreate },
      $transaction: jest.fn(
        (callback: (tx: { asset: { update: typeof update } }) => unknown) =>
          Promise.resolve(callback({ asset: { update } })),
      ),
    } as unknown as PrismaService;

    const service = new AssetsService(prisma, {} as CredentialsService);

    const result = await service.update(
      'asset-1',
      {
        owner: 'Infrastructure Team',
        department: 'IT Operations',
        responsibleParty: 'On-call SysAdmin',
        vendor: 'Example Vendor',
      },
      'user-1',
    );

    expect(capturedUpdate?.where).toEqual({ id: 'asset-1' });
    expect(capturedUpdate?.data).toMatchObject({
      owner: 'Infrastructure Team',
      department: 'IT Operations',
      responsibleParty: 'On-call SysAdmin',
      vendor: 'Example Vendor',
    });
    expect(result).toMatchObject({
      id: 'asset-1',
      owner: 'Infrastructure Team',
      department: 'IT Operations',
      responsibleParty: 'On-call SysAdmin',
      vendor: 'Example Vendor',
    });
    expect(capturedAudit?.data).toMatchObject({
      userId: 'user-1',
      targetId: 'asset-1',
    });
  });
});
