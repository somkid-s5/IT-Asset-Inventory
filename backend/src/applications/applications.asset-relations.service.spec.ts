import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { ApplicationsService } from './applications.service';

type ComponentCreateArgs = {
  data: {
    assetLinks?: {
      create: Array<{ assetId: string; relationType: string }>;
    };
  };
};

type ApplicationUpdateArgs = {
  data: {
    environments?: {
      create: Array<{
        components: {
          create: Array<{
            assetLinks?: {
              create: Array<{
                asset: { connect: { id: string } };
                relationType: string;
              }>;
            };
          }>;
        };
      }>;
    };
  };
};

const projectedApplication = {
  id: 'app-1',
  name: 'Example App',
  technicalOwner: null,
  businessUnit: null,
  description: null,
  status: 'ACTIVE',
  environments: [],
  access: [],
  documentLinks: [],
};

describe('ApplicationsService asset relationship classification', () => {
  it('marks a newly linked asset SHARED when it already has a PRIMARY relationship', async () => {
    let capturedCreate: ComponentCreateArgs | undefined;
    const applicationComponentAssetFindMany = jest
      .fn()
      .mockResolvedValue([{ assetId: 'asset-existing-primary' }]);
    const applicationComponentCreate = jest.fn((args: ComponentCreateArgs) => {
      capturedCreate = args;
      return Promise.resolve({ id: 'component-new' });
    });
    const prisma = {
      applicationEnvironment: {
        findFirst: jest.fn().mockResolvedValue({ id: 'env-1' }),
      },
      applicationComponent: {
        count: jest.fn().mockResolvedValue(0),
        create: applicationComponentCreate,
      },
      applicationComponentAsset: {
        findMany: applicationComponentAssetFindMany,
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    } as unknown as PrismaService;

    const service = new ApplicationsService(prisma, {} as CredentialsService);
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue(projectedApplication as never);

    await service.createComponent(
      'app-1',
      'env-1',
      {
        name: 'API',
        assetIds: ['asset-new', 'asset-existing-primary'],
      },
      'user-1',
    );

    expect(capturedCreate?.data.assetLinks?.create).toEqual([
      { assetId: 'asset-new', relationType: 'PRIMARY' },
      { assetId: 'asset-existing-primary', relationType: 'SHARED' },
    ]);
  });

  it('assigns only the first occurrence PRIMARY when rebuilding one Application', async () => {
    let capturedUpdate: ApplicationUpdateArgs | undefined;
    const applicationUpdate = jest.fn((args: ApplicationUpdateArgs) => {
      capturedUpdate = args;
      return Promise.resolve(projectedApplication);
    });
    const prisma = {
      application: { update: applicationUpdate },
      applicationComponent: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'old-component-1' },
            { id: 'old-component-2' },
          ]),
      },
      applicationComponentAsset: { findMany: jest.fn().mockResolvedValue([]) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    } as unknown as PrismaService;

    const service = new ApplicationsService(prisma, {} as CredentialsService);
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue(projectedApplication as never);

    await service.update(
      'app-1',
      {
        environments: [
          {
            name: 'PROD',
            components: [
              { name: 'Web', assetIds: ['asset-shared-within-app'] },
              { name: 'API', assetIds: ['asset-shared-within-app'] },
            ],
          },
        ],
      },
      'user-1',
    );

    const components =
      capturedUpdate?.data.environments?.create[0].components.create;
    expect(components?.[0].assetLinks?.create[0]).toMatchObject({
      asset: { connect: { id: 'asset-shared-within-app' } },
      relationType: 'PRIMARY',
    });
    expect(components?.[1].assetLinks?.create[0]).toMatchObject({
      asset: { connect: { id: 'asset-shared-within-app' } },
      relationType: 'SHARED',
    });
  });
});
