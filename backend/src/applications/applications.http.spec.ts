import { ExecutionContext, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import { DatabaseStatus, Role, VmLifecycleState } from '@prisma/client';
import request from 'supertest';
import { CredentialsService } from '../credentials/credentials.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

async function createHttpHarness(prisma: PrismaService) {
  const credentials = {
    encrypt: jest.fn((value: string) => `encrypted:${value}`),
  } as unknown as CredentialsService;
  const service = new ApplicationsService(prisma, credentials);
  jest.spyOn(service, 'findOne').mockResolvedValue({} as never);
  const testingModule = await Test.createTestingModule({
    controllers: [ApplicationsController],
    providers: [{ provide: ApplicationsService, useValue: service }],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate: (context: ExecutionContext) => {
        const request = context
          .switchToHttp()
          .getRequest<{ user?: { id: string; role: Role } }>();
        request.user = {
          id: 'user-1',
          role: Role.EDITOR,
        };
        return true;
      },
    })
    .overrideGuard(RolesGuard)
    .useValue({ canActivate: () => true })
    .compile();
  const app = testingModule.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  await app.init();
  return { app, server: app.getHttpServer() as Server, service };
}

type HttpErrorBody = { message: string };

describe('ApplicationsController Ticket 04 HTTP integrity boundary', () => {
  it('rejects a Component VM with a mismatched environment through HTTP', async () => {
    const { app, server } = await createHttpHarness({
      applicationEnvironment: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'env-prod', name: 'PROD' }),
      },
      vmInventory: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'vm-uat',
            environment: 'UAT',
            lifecycleState: VmLifecycleState.ACTIVE,
          },
        ]),
      },
    } as unknown as PrismaService);

    const response = await request(server)
      .post('/api/applications/app-1/environments/env-prod/components')
      .send({ name: 'Web', vmIds: ['vm-uat'] })
      .expect(400);
    expect((response.body as HttpErrorBody).message).toContain(
      'environment must match component environment PROD',
    );
    await app.close();
  });

  it('rejects an archived Logical Database through HTTP', async () => {
    const { app, server } = await createHttpHarness({
      applicationEnvironment: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'env-prod', name: 'PROD' }),
      },
      logicalDatabase: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'logical-archived',
            status: DatabaseStatus.ARCHIVED,
            databaseInventory: {
              id: 'db-prod',
              environment: 'PROD',
              status: DatabaseStatus.ACTIVE,
            },
          },
        ]),
      },
    } as unknown as PrismaService);

    const response = await request(server)
      .post('/api/applications/app-1/environments/env-prod/components')
      .send({ name: 'Database', logicalDatabaseIds: ['logical-archived'] })
      .expect(400);
    expect((response.body as HttpErrorBody).message).toContain(
      'cannot be newly linked',
    );
    await app.close();
  });

  it('accepts a valid Component VM link through HTTP', async () => {
    const componentCreate = jest.fn().mockResolvedValue({ id: 'component-1' });
    const { app, server } = await createHttpHarness({
      applicationEnvironment: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'env-prod', name: 'PROD' }),
      },
      vmInventory: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'vm-prod',
            environment: 'PROD',
            lifecycleState: VmLifecycleState.ACTIVE,
          },
        ]),
      },
      applicationComponentVm: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      applicationComponent: { create: componentCreate },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    } as unknown as PrismaService);

    await request(server)
      .post('/api/applications/app-1/environments/env-prod/components')
      .send({ name: 'Web', vmIds: ['vm-prod'], sortOrder: 0 })
      .expect(201);
    expect(componentCreate).toHaveBeenCalled();
    await app.close();
  });

  it('rejects Application Access owned by another application through HTTP', async () => {
    const prisma = {
      applicationEnvironment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'env-other',
          applicationId: 'app-other',
          name: 'PROD',
        }),
      },
    } as unknown as PrismaService;
    const { app, server } = await createHttpHarness(prisma);

    const response = await request(server)
      .post('/api/applications/app-1/access')
      .send({
        label: 'Console',
        address: 'https://prod.example.test',
        method: 'HTTPS',
        environmentId: 'env-other',
        isPrimary: true,
      })
      .expect(400);
    expect((response.body as HttpErrorBody).message).toContain(
      'must belong to an environment owned',
    );
    await app.close();
  });
});
