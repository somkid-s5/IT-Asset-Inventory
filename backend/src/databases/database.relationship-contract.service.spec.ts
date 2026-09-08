import { BadRequestException } from '@nestjs/common';
import { ApplicationStatus } from '@prisma/client';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { DatabasesService } from './databases.service';

describe('DatabasesService relationship contract', () => {
  it('rejects a Logical Database link to a different Application environment', async () => {
    const applicationComponentFindMany = jest.fn().mockResolvedValue([
      {
        id: 'component-uat',
        environment: {
          name: 'UAT',
          application: { status: ApplicationStatus.ACTIVE },
        },
      },
    ]);
    const prisma = {
      applicationComponent: { findMany: applicationComponentFindMany },
    } as unknown as PrismaService;
    const databases = new DatabasesService(prisma, {} as CredentialsService);
    const internals = databases as unknown as {
      validateLogicalDatabaseComponentSelection(
        databaseEnvironment: string,
        componentIds: string[],
      ): Promise<void>;
    };

    await expect(
      internals.validateLogicalDatabaseComponentSelection('PROD', [
        'component-uat',
      ]),
    ).rejects.toThrow(
      'Logical Database component component-uat must use the Database environment PROD.',
    );
  });

  it('rejects an archived Application as a new Logical Database topology link', async () => {
    const prisma = {
      applicationComponent: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'component-archived-app',
            environment: {
              name: 'PROD',
              application: { status: ApplicationStatus.ARCHIVED },
            },
          },
        ]),
      },
    } as unknown as PrismaService;
    const databases = new DatabasesService(prisma, {} as CredentialsService);
    const internals = databases as unknown as {
      validateLogicalDatabaseComponentSelection(
        databaseEnvironment: string,
        componentIds: string[],
      ): Promise<void>;
    };

    await expect(
      internals.validateLogicalDatabaseComponentSelection('PROD', [
        'component-archived-app',
      ]),
    ).rejects.toThrow(
      'Archived Application Component component-archived-app cannot be newly selected.',
    );
  });

  it('validates existing topology before accepting a Database environment change', async () => {
    const databaseUpdate = jest.fn();
    const prisma = {
      databaseInventory: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'db-1',
          environment: 'PROD',
          host: 'db-prod-01',
          hostAssetId: null,
          hostVmId: null,
        }),
        update: databaseUpdate,
      },
      logicalDatabase: {
        findMany: jest.fn().mockResolvedValue([
          {
            components: [
              { id: 'component-prod', environment: { name: 'PROD' } },
            ],
          },
        ]),
      },
    } as unknown as PrismaService;
    const databases = new DatabasesService(prisma, {} as CredentialsService);

    await expect(
      databases.update('db-1', { environment: 'UAT' }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(databaseUpdate).not.toHaveBeenCalled();
  });
});
