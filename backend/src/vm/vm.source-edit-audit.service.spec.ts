/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method */

import {
  AuditAction,
  VmSourceStatus,
  type VmVCenterSource,
} from '@prisma/client';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { VmService } from './vm.service';

const source: VmVCenterSource = {
  id: 'source-1',
  name: 'production-vcenter',
  endpoint: 'https://vcenter.example.local',
  version: '8.0',
  username: 'svc-vcenter',
  encryptedPassword: 'encrypted-secret',
  syncInterval: 15,
  status: VmSourceStatus.HEALTHY,
  lastSyncAt: new Date('2026-09-08T00:00:00Z'),
  notes: 'Production source',
  createdByUserId: 'admin-1',
  createdAt: new Date('2026-09-01T00:00:00Z'),
  updatedAt: new Date('2026-09-08T00:00:00Z'),
};

function createHarness() {
  const prisma = {
    vmVCenterSource: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  } as unknown as PrismaService;
  const credentials = {
    encrypt: jest.fn((value: string) => `encrypted:${value}`),
    decrypt: jest.fn(() => 'existing-password'),
  } as unknown as CredentialsService;

  return {
    prisma,
    credentials,
    service: new VmService(prisma, credentials),
  };
}

function stubConnection(service: VmService) {
  jest
    .spyOn(service as never, 'authenticateVcenter' as never)
    .mockResolvedValue({
      apiFamily: 'api',
      baseUrl: new URL('https://vcenter.example.local'),
      sessionId: 'session-1',
    } as never);
  jest
    .spyOn(service as never, 'getVcenterVersion' as never)
    .mockResolvedValue('8.0' as never);
}

describe('vCenter source edit and audit contract', () => {
  it('projects credential availability without returning a password or encrypted secret', async () => {
    const { prisma, service } = createHarness();
    (prisma.vmVCenterSource.findMany as jest.Mock).mockResolvedValue([
      { ...source, discoveries: [] },
    ]);

    const [result] = await service.findSources();

    expect(result).toMatchObject({ hasCredential: true });
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('encryptedPassword');
  });

  it('saves metadata-only edits without decrypting or re-testing existing credentials', async () => {
    const { prisma, credentials, service } = createHarness();
    const authenticate = jest.spyOn(
      service as never,
      'authenticateVcenter' as never,
    );
    const getVersion = jest.spyOn(
      service as never,
      'getVcenterVersion' as never,
    );
    (prisma.vmVCenterSource.findUnique as jest.Mock).mockResolvedValue(source);
    (prisma.vmVCenterSource.update as jest.Mock).mockResolvedValue({
      ...source,
      name: 'renamed-vcenter',
      notes: 'Updated operational notes',
      discoveries: [],
    });

    await service.updateSource(
      source.id,
      {
        name: 'renamed-vcenter',
        endpoint: source.endpoint,
        syncInterval: '30 min',
        notes: 'Updated operational notes',
      },
      'admin-1',
    );

    expect(authenticate).not.toHaveBeenCalled();
    expect(getVersion).not.toHaveBeenCalled();
    expect(credentials.decrypt).not.toHaveBeenCalled();
    expect(prisma.vmVCenterSource.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'renamed-vcenter',
          syncInterval: 30,
          notes: 'Updated operational notes',
        }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: AuditAction.UPDATE_SOURCE }),
      }),
    );
  });

  it('requires a successful connection test when endpoint or credentials change and preserves blank password', async () => {
    const { prisma, credentials, service } = createHarness();
    stubConnection(service);
    (prisma.vmVCenterSource.findUnique as jest.Mock).mockResolvedValue(source);
    (prisma.vmVCenterSource.update as jest.Mock).mockResolvedValue({
      ...source,
      endpoint: 'https://vcenter-new.example.local',
      discoveries: [],
    });

    await service.updateSource(
      source.id,
      {
        name: source.name,
        endpoint: 'https://vcenter-new.example.local',
        syncInterval: '15 min',
        notes: source.notes ?? undefined,
      },
      'admin-1',
    );

    expect(
      (service as never as { authenticateVcenter: jest.Mock })
        .authenticateVcenter,
    ).toHaveBeenCalledWith(
      'https://vcenter-new.example.local',
      source.username,
      'existing-password',
    );
    expect(credentials.decrypt).toHaveBeenCalledWith(source.encryptedPassword);
    expect(prisma.vmVCenterSource.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          encryptedPassword: expect.anything(),
        }),
      }),
    );
  });

  it('records source lifecycle actions with explicit audit taxonomy', async () => {
    const createHarnessResult = createHarness();
    stubConnection(createHarnessResult.service);
    (
      createHarnessResult.prisma.vmVCenterSource.create as jest.Mock
    ).mockResolvedValue({
      ...source,
      id: 'source-created',
      discoveries: [],
    });

    await createHarnessResult.service.createSource(
      {
        name: 'new-vcenter',
        endpoint: source.endpoint,
        username: source.username ?? undefined,
        password: 'new-password',
        syncInterval: '15 min',
      },
      'admin-1',
    );
    expect(createHarnessResult.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: AuditAction.CREATE_SOURCE }),
      }),
    );

    const archiveHarness = createHarness();
    (
      archiveHarness.prisma.vmVCenterSource.findUnique as jest.Mock
    ).mockResolvedValue(source);
    await archiveHarness.service.archiveSource(source.id, 'admin-1');
    expect(archiveHarness.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: AuditAction.ARCHIVE_SOURCE }),
      }),
    );

    const restoreHarness = createHarness();
    (
      restoreHarness.prisma.vmVCenterSource.findUnique as jest.Mock
    ).mockResolvedValue(source);
    await restoreHarness.service.restoreSource(source.id, 'admin-1');
    expect(restoreHarness.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: AuditAction.RESTORE_SOURCE }),
      }),
    );
  });
});
