import { AuditAction, DatabaseStatus } from '@prisma/client';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { DatabasesService } from './databases.service';

describe('DatabasesService lifecycle and credential audit contract', () => {
  it('archives and restores a Logical Database without deleting relation rows', async () => {
    const logicalUpdate = jest
      .fn()
      .mockResolvedValueOnce({
        id: 'logical-1',
        name: 'billing',
        status: DatabaseStatus.ARCHIVED,
      })
      .mockResolvedValueOnce({
        id: 'logical-1',
        name: 'billing',
        status: DatabaseStatus.ACTIVE,
      });
    const logicalDelete = jest.fn();
    const prisma = {
      logicalDatabase: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'logical-1', name: 'billing' }),
        update: logicalUpdate,
        delete: logicalDelete,
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    } as unknown as PrismaService;
    const service = new DatabasesService(prisma, {} as CredentialsService);

    await service.deleteLogicalDatabase('db-1', 'logical-1', 'user-1');
    await service.restoreLogicalDatabase('db-1', 'logical-1', 'user-1');

    expect(logicalDelete).not.toHaveBeenCalled();
    expect(logicalUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: 'logical-1' },
      data: { status: DatabaseStatus.ARCHIVED },
    });
    expect(logicalUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: 'logical-1' },
      data: { status: DatabaseStatus.ACTIVE },
    });
  });

  it('records VIEW_PASSWORD audit when a Database account password is revealed', async () => {
    const capturedAudits: Array<{
      data: {
        userId: string;
        action: AuditAction;
        targetId: string;
        details?: string;
      };
    }> = [];
    const auditCreate = jest.fn((args: (typeof capturedAudits)[number]) => {
      capturedAudits.push(args);
      return Promise.resolve({});
    });
    const decrypt = jest.fn().mockReturnValue('plain-secret');
    const prisma = {
      databaseAccount: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'acct-1',
          databaseInventoryId: 'db-1',
          username: 'app_user',
          encryptedPassword: 'ciphertext',
        }),
      },
      auditLog: { create: auditCreate },
    } as unknown as PrismaService;
    const service = new DatabasesService(prisma, {
      decrypt,
    } as unknown as CredentialsService);
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ name: 'Treasury DB' } as never);

    await expect(
      service.revealPassword('db-1', 'acct-1', 'user-1'),
    ).resolves.toEqual({
      password: 'plain-secret',
    });
    expect(capturedAudits[0]?.data).toMatchObject({
      userId: 'user-1',
      action: AuditAction.VIEW_PASSWORD,
      targetId: 'acct-1',
    });
  });

  it('records COPY_PASSWORD audit when a Database account password is copied', async () => {
    const capturedAudits: Array<{
      data: {
        userId: string;
        action: AuditAction;
        targetId: string;
        details?: string;
      };
    }> = [];
    const auditCreate = jest.fn((args: (typeof capturedAudits)[number]) => {
      capturedAudits.push(args);
      return Promise.resolve({});
    });
    const prisma = {
      databaseAccount: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'acct-1', username: 'app_user' }),
      },
      auditLog: { create: auditCreate },
    } as unknown as PrismaService;
    const service = new DatabasesService(prisma, {} as CredentialsService);

    await expect(
      service.recordCopy('db-1', 'acct-1', 'user-1'),
    ).resolves.toEqual({ recorded: true });
    expect(capturedAudits[0]?.data).toMatchObject({
      userId: 'user-1',
      action: AuditAction.COPY_PASSWORD,
      targetId: 'acct-1',
    });
  });
});
