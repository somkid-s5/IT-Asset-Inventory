import { BadRequestException } from '@nestjs/common';
import { VmSourceStatus, type VmVCenterSource } from '@prisma/client';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { VmService } from './vm.service';

type SourceLifecycleInternals = {
  shouldAutoSyncSource(source: VmVCenterSource, now: Date): boolean;
};

const archivedSource: VmVCenterSource = {
  id: 'source-archived',
  name: 'archived-vcenter',
  endpoint: 'https://vcenter.example.local',
  version: '8.0',
  username: null,
  encryptedPassword: null,
  syncInterval: 15,
  status: VmSourceStatus.ARCHIVED,
  lastSyncAt: null,
  notes: null,
  createdByUserId: null,
  createdAt: new Date('2026-09-01T00:00:00Z'),
  updatedAt: new Date('2026-09-01T00:00:00Z'),
};

describe('VmService vCenter source lifecycle contract', () => {
  it('never schedules an archived source for automatic synchronization', () => {
    const service = new VmService(
      {} as PrismaService,
      {} as CredentialsService,
    );
    const internals = service as unknown as SourceLifecycleInternals;

    expect(internals.shouldAutoSyncSource(archivedSource, new Date())).toBe(
      false,
    );
  });

  it('rejects manual sync for an archived source before any connection attempt', async () => {
    const sourceUpdate = jest.fn();
    const prisma = {
      vmVCenterSource: {
        findUnique: jest.fn().mockResolvedValue(archivedSource),
        update: sourceUpdate,
      },
      auditLog: {
        create: jest.fn(),
      },
    } as unknown as PrismaService;
    const service = new VmService(prisma, {} as CredentialsService);

    await expect(
      service.syncSource(archivedSource.id, 'user-1'),
    ).rejects.toThrow(BadRequestException);
    expect(sourceUpdate).not.toHaveBeenCalled();
  });
});
