import { AuditAction } from '@prisma/client';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { VmService } from './vm.service';

type AuditCreateArgs = {
  data: {
    userId: string;
    action: AuditAction;
    targetId: string;
    details: string;
  };
};

describe('VmService guest credential audit contract', () => {
  it('reveals a VM guest password through the VM credential path and audits the reveal', async () => {
    let capturedAudit: AuditCreateArgs | undefined;
    const prisma = {
      vmGuestAccount: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'guest-1',
          username: 'svc-app',
          encryptedPassword: 'encrypted-secret',
          inventoryId: 'vm-1',
          discoveryId: null,
        }),
      },
      auditLog: {
        create: jest.fn((args: AuditCreateArgs) => {
          capturedAudit = args;
          return Promise.resolve({});
        }),
      },
    } as unknown as PrismaService;
    const credentials = {
      decrypt: jest.fn().mockReturnValue('plain-secret'),
    } as unknown as CredentialsService;
    const service = new VmService(prisma, credentials);

    await expect(
      service.revealGuestAccountPassword('guest-1', 'user-1'),
    ).resolves.toEqual({
      password: 'plain-secret',
    });

    expect(capturedAudit?.data).toMatchObject({
      userId: 'user-1',
      action: AuditAction.VIEW_PASSWORD,
      targetId: 'guest-1',
    });
  });

  it('records COPY_PASSWORD separately from reveal', async () => {
    let capturedAudit: AuditCreateArgs | undefined;
    const prisma = {
      vmGuestAccount: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'guest-1',
          username: 'svc-app',
          inventoryId: 'vm-1',
          discoveryId: null,
        }),
      },
      auditLog: {
        create: jest.fn((args: AuditCreateArgs) => {
          capturedAudit = args;
          return Promise.resolve({});
        }),
      },
    } as unknown as PrismaService;
    const service = new VmService(prisma, {} as CredentialsService);

    await expect(
      service.recordGuestAccountCopy('guest-1', 'user-1'),
    ).resolves.toEqual({
      recorded: true,
    });

    expect(capturedAudit?.data).toMatchObject({
      userId: 'user-1',
      action: AuditAction.COPY_PASSWORD,
      targetId: 'guest-1',
    });
  });
});
