import {
  ApplicationStatus,
  DatabaseStatus,
  Role,
  VmLifecycleState,
} from '@prisma/client';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { ApplicationsService } from './applications.service';

const credentials = {
  encrypt: jest.fn((value: string) => `encrypted:${value}`),
} as unknown as CredentialsService;

type IntegrityInternals = {
  validateComponentRelations: (
    environmentName: string,
    vmIds: string[] | undefined,
    logicalDatabaseIds: string[] | undefined,
    retained?: { vmIds?: Set<string>; logicalDatabaseIds?: Set<string> },
  ) => Promise<void>;
  buildComponentAssetLinks: (
    assetIds: string[] | undefined,
    options: { excludeComponentId?: string; preserveComponentId?: string },
  ) => Promise<
    Array<{
      assetId: string;
      relationType: string;
      responsibleParty?: string | null;
    }>
  >;
  project: (
    app: unknown,
    role: Role,
  ) => { access: Array<{ isPrimary: boolean; sortOrder: number }> };
};

describe('ApplicationsService Ticket 04 integrity contracts', () => {
  it('rejects an access environment owned by another application', async () => {
    const prisma = {
      applicationEnvironment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'env-uat',
          applicationId: 'other-app',
          name: 'UAT',
        }),
      },
    } as unknown as PrismaService;
    const service = new ApplicationsService(prisma, credentials);
    jest.spyOn(service, 'findOne').mockResolvedValue({} as never);

    await expect(
      service.createAccess(
        'app-prod',
        {
          label: 'UAT console',
          address: 'https://uat.example.test',
          method: 'HTTPS',
          environmentId: 'env-uat',
          isPrimary: true,
        },
        'user-1',
      ),
    ).rejects.toThrow(
      'Application access must belong to an environment owned by the application.',
    );
  });

  it('makes primary access explicit and clears the prior primary atomically', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const create = jest.fn().mockResolvedValue({ id: 'access-2' });
    const prisma = {
      applicationEnvironment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'env-prod',
          applicationId: 'app-1',
          name: 'PROD',
        }),
      },
      applicationAccess: {
        findFirst: jest.fn().mockResolvedValue({ sortOrder: 4 }),
        updateMany,
        create,
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback({ applicationAccess: { updateMany, create } }),
      ),
    } as unknown as PrismaService;
    const service = new ApplicationsService(prisma, credentials);
    jest.spyOn(service, 'findOne').mockResolvedValue({} as never);

    await service.createAccess(
      'app-1',
      {
        label: 'Primary console',
        address: 'https://prod.example.test',
        method: 'HTTPS',
        environmentId: 'env-prod',
        isPrimary: true,
      },
      'user-1',
    );

    expect(updateMany).toHaveBeenCalledWith({
      where: { environmentId: 'env-prod', isPrimary: true },
      data: { isPrimary: false },
    });
    type CreateAccessCall = {
      data: {
        environmentId: string;
        sortOrder: number;
        isPrimary: boolean;
      };
    };
    const calls = create.mock.calls as unknown as Array<[CreateAccessCall]>;
    const createCall = calls.at(-1)?.[0];
    expect(createCall?.data).toMatchObject({
      environmentId: 'env-prod',
      sortOrder: 5,
      isPrimary: true,
    });
  });

  it('rejects mismatched, archived, and cross-environment topology links', async () => {
    const prisma = {
      vmInventory: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'vm-uat',
            environment: 'UAT',
            lifecycleState: VmLifecycleState.ACTIVE,
          },
        ]),
      },
      logicalDatabase: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'logical-prod',
            status: DatabaseStatus.ACTIVE,
            databaseInventory: {
              id: 'db-prod',
              environment: 'PROD',
              status: DatabaseStatus.ACTIVE,
            },
          },
        ]),
      },
    } as unknown as PrismaService;
    const internals = new ApplicationsService(
      prisma,
      credentials,
    ) as unknown as IntegrityInternals;

    await expect(
      internals.validateComponentRelations('PROD', ['vm-uat'], undefined),
    ).rejects.toThrow('environment must match component environment PROD');
    await expect(
      internals.validateComponentRelations('UAT', undefined, ['logical-prod']),
    ).rejects.toThrow(
      'parent Database environment must match component environment UAT',
    );
  });

  it('rejects archived links unless they are retained historical links', async () => {
    const prisma = {
      vmInventory: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'vm-archived',
            environment: 'PROD',
            lifecycleState: VmLifecycleState.ARCHIVED,
          },
        ]),
      },
    } as unknown as PrismaService;
    const internals = new ApplicationsService(
      prisma,
      credentials,
    ) as unknown as IntegrityInternals;

    await expect(
      internals.validateComponentRelations('PROD', ['vm-archived'], undefined),
    ).rejects.toThrow('cannot be newly linked');
    await expect(
      internals.validateComponentRelations('PROD', ['vm-archived'], undefined, {
        vmIds: new Set(['vm-archived']),
      }),
    ).resolves.toBeUndefined();
  });

  it('preserves retained relation metadata during component link updates', async () => {
    const prisma = {
      applicationComponentAsset: {
        findMany: jest.fn(({ where }: { where: Record<string, unknown> }) =>
          where.relationType
            ? Promise.resolve([])
            : Promise.resolve([
                {
                  assetId: 'asset-1',
                  relationType: 'SHARED',
                  responsibleParty: 'Platform Team',
                },
              ]),
        ),
      },
      applicationComponent: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const internals = new ApplicationsService(
      prisma,
      credentials,
    ) as unknown as IntegrityInternals;

    await expect(
      internals.buildComponentAssetLinks(['asset-1'], {
        excludeComponentId: 'component-1',
        preserveComponentId: 'component-1',
      }),
    ).resolves.toEqual([
      {
        assetId: 'asset-1',
        relationType: 'SHARED',
        responsibleParty: 'Platform Team',
      },
    ]);
  });

  it('projects explicit primary/order metadata without encrypted secrets', () => {
    const prisma = {} as PrismaService;
    const internals = new ApplicationsService(
      prisma,
      credentials,
    ) as unknown as IntegrityInternals;
    const projected = internals.project(
      {
        id: 'app-1',
        name: 'Inventory App',
        technicalOwner: null,
        businessUnit: null,
        description: 'Application',
        status: ApplicationStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdByUser: {
          id: 'user-1',
          displayName: 'Admin',
          username: 'admin',
        },
        environments: [],
        access: [
          {
            id: 'access-1',
            applicationId: 'app-1',
            environmentId: 'env-1',
            environment: { id: 'env-1', name: 'PROD' },
            label: 'Console',
            address: 'https://prod.example.test',
            method: 'HTTPS',
            sortOrder: 2,
            isPrimary: true,
            credentials: [
              {
                id: 'credential-1',
                username: 'operator',
                role: 'Admin',
                encryptedPassword: 'ciphertext-must-not-leak',
                lastChangedDate: null,
              },
            ],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        documentLinks: [],
      },
      Role.EDITOR,
    );

    expect(projected.access[0]).toMatchObject({
      isPrimary: true,
      sortOrder: 2,
    });
    expect(JSON.stringify(projected)).not.toContain('ciphertext-must-not-leak');
    expect(JSON.stringify(projected)).not.toContain('encryptedPassword');
  });
});
