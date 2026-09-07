import { BadRequestException } from '@nestjs/common';
import { DatabaseAccountScope } from '@prisma/client';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { DatabasesService } from './databases.service';

type AccountMutation = {
  deleteMany?: { id: { in: string[] } };
  update?: Array<{
    where: { id: string };
    data: Record<string, unknown>;
  }>;
  create?: Array<Record<string, unknown>>;
};

type AccountContractInternals = {
  prepareAccountMutation(
    databaseId: string,
    accounts:
      | Array<{
          id?: string;
          username: string;
          role: string;
          password?: string;
          privileges: string[];
          note?: string;
          scope?: DatabaseAccountScope;
          logicalDatabaseIds?: string[];
        }>
      | undefined,
    removedAccountIds: string[] | undefined,
  ): Promise<AccountMutation | undefined>;
  validateLogicalDatabaseScopes(
    databaseId: string | undefined,
    accounts:
      | Array<{
          username: string;
          role: string;
          password?: string;
          privileges: string[];
          scope?: DatabaseAccountScope;
          logicalDatabaseIds?: string[];
        }>
      | undefined,
  ): Promise<void>;
};

describe('DatabasesService account identity, secret, and scope contract', () => {
  it('preserves the encrypted password when an existing account is edited with a blank password', async () => {
    const encrypt = jest.fn((value: string) => `encrypted:${value}`);
    const prisma = {
      databaseAccount: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'acct-1', username: 'app_user' }]),
      },
    } as unknown as PrismaService;
    const service = new DatabasesService(prisma, {
      encrypt,
    } as CredentialsService);
    const internals = service as unknown as AccountContractInternals;

    const mutation = await internals.prepareAccountMutation(
      'db-1',
      [
        {
          id: 'acct-1',
          username: 'app_user',
          role: 'Application',
          password: '',
          privileges: ['SELECT'],
          scope: DatabaseAccountScope.INSTANCE,
          logicalDatabaseIds: [],
        },
      ],
      undefined,
    );

    expect(encrypt).not.toHaveBeenCalled();
    expect(mutation?.update).toHaveLength(1);
    expect(mutation?.update?.[0]?.data).not.toHaveProperty('encryptedPassword');
    expect(mutation?.update?.[0]?.data).toMatchObject({
      username: 'app_user',
      scope: DatabaseAccountScope.INSTANCE,
    });
  });

  it('deletes an existing account only when its ID is explicitly submitted for removal', async () => {
    const prisma = {
      databaseAccount: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'acct-1', username: 'app_user' }]),
      },
    } as unknown as PrismaService;
    const service = new DatabasesService(prisma, {} as CredentialsService);
    const internals = service as unknown as AccountContractInternals;

    const untouched = await internals.prepareAccountMutation(
      'db-1',
      undefined,
      undefined,
    );
    expect(untouched).toBeUndefined();

    const mutation = await internals.prepareAccountMutation('db-1', undefined, [
      'acct-1',
    ]);
    expect(mutation).toEqual({ deleteMany: { id: { in: ['acct-1'] } } });
  });

  it('rejects a duplicate username in the final Instance account set', async () => {
    const prisma = {
      databaseAccount: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'acct-1', username: 'app_user' }]),
      },
    } as unknown as PrismaService;
    const service = new DatabasesService(prisma, {} as CredentialsService);
    const internals = service as unknown as AccountContractInternals;

    await expect(
      internals.prepareAccountMutation(
        'db-1',
        [
          {
            username: 'app_user',
            role: 'Reporting',
            password: 'new-secret',
            privileges: ['SELECT'],
          },
        ],
        undefined,
      ),
    ).rejects.toThrow(
      'Database account usernames must be unique within an Instance.',
    );
  });

  it('rejects Logical Database selections for an INSTANCE-scoped account', async () => {
    const service = new DatabasesService(
      {} as PrismaService,
      {} as CredentialsService,
    );
    const internals = service as unknown as AccountContractInternals;

    await expect(
      internals.validateLogicalDatabaseScopes('db-1', [
        {
          username: 'app_user',
          role: 'Application',
          privileges: ['SELECT'],
          scope: DatabaseAccountScope.INSTANCE,
          logicalDatabaseIds: ['logical-1'],
        },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires at least one Logical Database for LOGICAL_DATABASES scope', async () => {
    const service = new DatabasesService(
      {} as PrismaService,
      {} as CredentialsService,
    );
    const internals = service as unknown as AccountContractInternals;

    await expect(
      internals.validateLogicalDatabaseScopes('db-1', [
        {
          username: 'app_user',
          role: 'Application',
          privileges: ['SELECT'],
          scope: DatabaseAccountScope.LOGICAL_DATABASES,
          logicalDatabaseIds: [],
        },
      ]),
    ).rejects.toThrow('must select at least one Logical Database');
  });

  it('rejects a Logical Database scope that belongs to another Instance', async () => {
    const prisma = {
      logicalDatabase: { count: jest.fn().mockResolvedValue(0) },
    } as unknown as PrismaService;
    const service = new DatabasesService(prisma, {} as CredentialsService);
    const internals = service as unknown as AccountContractInternals;

    await expect(
      internals.validateLogicalDatabaseScopes('db-1', [
        {
          username: 'app_user',
          role: 'Application',
          privileges: ['SELECT'],
          scope: DatabaseAccountScope.LOGICAL_DATABASES,
          logicalDatabaseIds: ['logical-other-db'],
        },
      ]),
    ).rejects.toThrow(
      'Each logical database scope must belong to this database inventory',
    );
  });
});
