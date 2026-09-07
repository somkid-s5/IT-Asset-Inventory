import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { ApplicationsService } from './applications.service';

type ComponentCreateArgs = {
  data: {
    vmLinks?: {
      create: Array<{ vmId: string; relationType: string }>;
    };
  };
};

type ApplicationUpdateArgs = {
  data: {
    environments?: {
      create: Array<{
        components: {
          create: Array<{
            vmLinks?: {
              create: Array<{
                vm: { connect: { id: string } };
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

describe('ApplicationsService VM relationship classification', () => {
  it('marks a newly linked VM SHARED when it already has a PRIMARY relationship', async () => {
    let capturedCreate: ComponentCreateArgs | undefined;
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
        findMany: jest.fn().mockResolvedValue([]),
      },
      applicationComponentVm: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ vmId: 'vm-existing-primary' }]),
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
        vmIds: ['vm-new', 'vm-existing-primary'],
      },
      'user-1',
    );

    expect(capturedCreate?.data.vmLinks?.create).toEqual([
      { vmId: 'vm-new', relationType: 'PRIMARY' },
      { vmId: 'vm-existing-primary', relationType: 'SHARED' },
    ]);
  });

  it('assigns only the first VM occurrence PRIMARY when rebuilding one Application', async () => {
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
      applicationComponentVm: { findMany: jest.fn().mockResolvedValue([]) },
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
              { name: 'Web', vmIds: ['vm-shared-within-app'] },
              { name: 'API', vmIds: ['vm-shared-within-app'] },
            ],
          },
        ],
      },
      'user-1',
    );

    const components =
      capturedUpdate?.data.environments?.create[0].components.create;
    expect(components?.[0].vmLinks?.create[0]).toMatchObject({
      vm: { connect: { id: 'vm-shared-within-app' } },
      relationType: 'PRIMARY',
    });
    expect(components?.[1].vmLinks?.create[0]).toMatchObject({
      vm: { connect: { id: 'vm-shared-within-app' } },
      relationType: 'SHARED',
    });
  });
});
