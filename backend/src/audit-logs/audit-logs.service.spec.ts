import { BadRequestException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService, redactAuditDetails } from './audit-logs.service';

describe('AuditLogsService server-authoritative query contract', () => {
  it('searches, filters, sorts, paginates, and summarizes the complete filtered dataset', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'audit-201',
          userId: 'user-1',
          action: AuditAction.ARCHIVE_SOURCE,
          targetId: 'source-1',
          ipAddress: '10.0.0.2',
          details: JSON.stringify({ source: 'vc-prod' }),
          timestamp: new Date('2026-09-08T10:00:00Z'),
          user: {
            id: 'user-1',
            username: 'admin',
            displayName: 'Admin',
            avatarSeed: 'admin',
            avatarImage: null,
          },
        },
      ])
      .mockResolvedValueOnce([{ userId: 'user-1' }, { userId: 'user-2' }]);
    const count = jest
      .fn()
      .mockResolvedValueOnce(201)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(7);
    const prisma = {
      auditLog: { findMany, count },
    } as unknown as PrismaService;
    const service = new AuditLogsService(prisma);

    const result = await service.findAll({
      page: 3,
      limit: 500,
      search: 'admin',
      action: 'ARCHIVE_SOURCE',
      actorId: 'user-1',
      from: '2026-09-01',
      to: '2026-09-30',
      sortBy: 'action',
      sortDir: 'asc',
    });

    expect(findMany).toHaveBeenCalledTimes(2);
    const firstFindManyArgs = (
      findMany.mock.calls as unknown as Array<[Record<string, unknown>]>
    )[0][0];
    expect(firstFindManyArgs).toMatchObject({
      skip: 200,
      take: 100,
      orderBy: [{ action: 'asc' }, { id: 'desc' }],
    });
    expect(firstFindManyArgs.where as Record<string, unknown>).toMatchObject({
      action: AuditAction.ARCHIVE_SOURCE,
      userId: 'user-1',
    });
    expect(result).toMatchObject({
      data: [{ id: 'audit-201', action: AuditAction.ARCHIVE_SOURCE }],
      meta: { total: 201, page: 3, limit: 100, totalPages: 3 },
      summary: {
        totalEvents: 201,
        todayEvents: 4,
        deleteEvents: 7,
        uniqueActors: 2,
        scope: 'all events matching the current filters',
      },
    });
  });

  it('rejects unsupported action and invalid date filters', async () => {
    const prisma = {
      auditLog: { findMany: jest.fn(), count: jest.fn() },
    } as unknown as PrismaService;
    const service = new AuditLogsService(prisma);

    await expect(
      service.findAll({ action: 'NOT_A_REAL_ACTION' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.findAll({ from: 'not-a-date' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('redactAuditDetails', () => {
  it('keeps audit detail useful without exposing secret-shaped fields', () => {
    const result = redactAuditDetails(
      JSON.stringify({
        username: 'admin',
        password: 'plain-secret',
        encryptedPassword: 'ciphertext',
      }),
    );

    expect(result).toContain('admin');
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('plain-secret');
    expect(result).not.toContain('ciphertext');
  });
});
