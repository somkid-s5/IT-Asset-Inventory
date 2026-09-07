import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from './assets.service';

type LinkRow = { ipAllocationId: string; credentialId: string };
type LinkCreateArgs = { data: LinkRow[]; skipDuplicates: boolean };

describe('AssetsService explicit Access Point credential links', () => {
  const credentialsService = {
    encrypt: jest.fn((value: string) => `enc:${value}`),
  } as unknown as CredentialsService;

  function makeCreateHarness() {
    let capturedLinkCreate: LinkCreateArgs | undefined;
    const linkCreateMany = jest.fn((args: LinkCreateArgs) => {
      capturedLinkCreate = args;
      return Promise.resolve({ count: args.data.length });
    });
    const allocationFindMany = jest.fn();
    const assetCreate = jest.fn().mockResolvedValue({
      id: 'asset-1',
      name: 'server-1',
      type: 'SERVER',
      assetId: 'ASSET-1',
    });
    const tx = {
      asset: { create: assetCreate },
      iPAllocation: { findMany: allocationFindMany },
      iPAllocationCredential: { createMany: linkCreateMany },
    };
    const prisma = {
      credential: { count: jest.fn().mockResolvedValue(0) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    } as unknown as PrismaService;
    const service = new AssetsService(prisma, credentialsService);
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ id: 'asset-1' } as never);
    return {
      service,
      allocationFindMany,
      getCapturedLinkCreate: () => capturedLinkCreate,
    };
  }

  it('links multiple credential accounts to one Access Point explicitly', async () => {
    const { service, allocationFindMany, getCapturedLinkCreate } =
      makeCreateHarness();
    allocationFindMany.mockResolvedValue([
      { id: 'ip-1', address: '10.0.0.10' },
    ]);

    await service.create(
      {
        name: 'server-1',
        type: 'SERVER',
        credentials: [
          { id: 'cred-1', username: 'admin', password: 'one' },
          { id: 'cred-2', username: 'ops', password: 'two' },
        ],
        ips: [
          {
            address: '10.0.0.10',
            type: 'Management',
            credentialIds: ['cred-1', 'cred-2'],
          },
        ],
      },
      'user-1',
    );

    expect(getCapturedLinkCreate()).toEqual({
      data: [
        { ipAllocationId: 'ip-1', credentialId: 'cred-1' },
        { ipAllocationId: 'ip-1', credentialId: 'cred-2' },
      ],
      skipDuplicates: true,
    });
  });

  it('can explicitly share one credential across multiple Access Points', async () => {
    const { service, allocationFindMany, getCapturedLinkCreate } =
      makeCreateHarness();
    allocationFindMany.mockResolvedValue([
      { id: 'ip-host', address: '10.0.0.20' },
      { id: 'ip-mgmt', address: '10.0.0.21' },
    ]);

    await service.create(
      {
        name: 'server-2',
        type: 'SERVER',
        credentials: [{ id: 'cred-shared', username: 'svc', password: 'pw' }],
        ips: [
          {
            address: '10.0.0.20',
            type: 'Host',
            credentialIds: ['cred-shared'],
          },
          {
            address: '10.0.0.21',
            type: 'Management',
            credentialIds: ['cred-shared'],
          },
        ],
      },
      'user-1',
    );

    expect(getCapturedLinkCreate()?.data).toEqual([
      { ipAllocationId: 'ip-host', credentialId: 'cred-shared' },
      { ipAllocationId: 'ip-mgmt', credentialId: 'cred-shared' },
    ]);
  });

  it('restores explicit links when credentials are replaced without replacing Access Points', async () => {
    const preservedLinks: LinkRow[] = [
      { ipAllocationId: 'ip-1', credentialId: 'cred-1' },
      { ipAllocationId: 'ip-1', credentialId: 'cred-2' },
    ];
    let capturedLinkCreate: LinkCreateArgs | undefined;
    const linkCreateMany = jest.fn((args: LinkCreateArgs) => {
      capturedLinkCreate = args;
      return Promise.resolve({ count: args.data.length });
    });
    const tx = {
      asset: {
        update: jest.fn().mockResolvedValue({
          id: 'asset-1',
          name: 'server-1',
          type: 'SERVER',
          assetId: 'ASSET-1',
        }),
      },
      iPAllocationCredential: { createMany: linkCreateMany },
      iPAllocation: { findMany: jest.fn() },
    };
    const prisma = {
      credential: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'cred-1',
            assetId: 'asset-1',
            encryptedPassword: 'enc:one',
          },
          {
            id: 'cred-2',
            assetId: 'asset-1',
            encryptedPassword: 'enc:two',
          },
        ]),
      },
      iPAllocationCredential: {
        findMany: jest.fn().mockResolvedValue(preservedLinks),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    } as unknown as PrismaService;
    const service = new AssetsService(prisma, credentialsService);
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ id: 'asset-1' } as never);

    await service.update(
      'asset-1',
      {
        credentials: [
          { id: 'cred-1', username: 'admin', password: '' },
          { id: 'cred-2', username: 'ops', password: '' },
        ],
      },
      'user-1',
    );

    expect(capturedLinkCreate).toEqual({
      data: preservedLinks,
      skipDuplicates: true,
    });
  });
});
