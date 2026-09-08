import { BadRequestException } from '@nestjs/common';
import {
  RelationPickerLifecycleFilter,
  RelationPickerResourceKind,
  type RelationPickerQueryDto,
} from './dto/relation-picker-query.dto';
import { RelationPickerService } from './relation-picker.service';

function query(
  overrides: Partial<RelationPickerQueryDto> = {},
): RelationPickerQueryDto {
  return {
    kind: RelationPickerResourceKind.ASSETS,
    ...overrides,
  };
}

describe('RelationPickerService', () => {
  it('searches assets with bounded server pagination beyond the historical 200-row cap', async () => {
    const prisma = {
      asset: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'asset-201',
            name: 'Asset 201',
            assetId: 'INV-0201',
            type: 'SERVER',
            environment: 'PROD',
            status: 'ACTIVE',
          },
        ]),
        count: jest.fn().mockResolvedValue(201),
      },
    };
    const service = new RelationPickerService(prisma as never);

    const result = await service.search(
      query({ q: 'Asset 201', page: 9, pageSize: 25 }),
    );

    expect(prisma.asset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 200, take: 25 }),
    );
    expect(result.total).toBe(201);
    expect(result.items[0]).toEqual({
      id: 'asset-201',
      label: 'Asset 201',
      metadata: 'INV-0201 · SERVER · PROD',
      lifecycle: 'ACTIVE',
      archived: false,
    });
    expect(JSON.stringify(result)).not.toMatch(/password|credential|account/i);
  });

  it('searches databases beyond the historical 200-row cap and returns metadata', async () => {
    const prisma = {
      databaseInventory: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'database-201',
            name: 'Database 201',
            engine: 'PostgreSQL',
            environment: 'UAT',
            status: 'ACTIVE',
          },
        ]),
        count: jest.fn().mockResolvedValue(201),
      },
    };
    const service = new RelationPickerService(prisma as never);

    const result = await service.search(
      query({ kind: RelationPickerResourceKind.DATABASES, q: 'Database 201' }),
    );

    expect(result.items[0]?.id).toBe('database-201');
    expect(result.total).toBe(201);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBeTruthy();
  });

  it('searches VMs with server-side pagination beyond the historical 1000-row cap', async () => {
    const prisma = {
      vmInventory: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'vm-1001',
            name: 'vm-1001',
            systemName: 'system-1001',
            primaryIp: '10.0.0.1001',
            environment: 'TEST',
            lifecycleState: 'ACTIVE',
          },
        ]),
        count: jest.fn().mockResolvedValue(1001),
      },
    };
    const service = new RelationPickerService(prisma as never);

    const result = await service.search(
      query({
        kind: RelationPickerResourceKind.VMS,
        q: 'system-1001',
        page: 41,
        pageSize: 25,
      }),
    );

    expect(prisma.vmInventory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 1000, take: 25 }),
    );
    expect(result.items[0]?.label).toBe('system-1001');
    expect(result.total).toBe(1001);
  });

  it('keeps selected archived records visible while excluding them from eligible results', async () => {
    const prisma = {
      asset: {
        findMany: jest.fn((args: { where: { id?: unknown } }) =>
          args.where.id
            ? Promise.resolve([
                {
                  id: 'archived-asset',
                  name: 'Archived asset',
                  assetId: 'INV-ARCHIVED',
                  type: 'SERVER',
                  environment: 'PROD',
                  status: 'ARCHIVED',
                },
              ])
            : Promise.resolve([
                {
                  id: 'active-asset',
                  name: 'Active asset',
                  assetId: 'INV-ACTIVE',
                  type: 'SERVER',
                  environment: 'PROD',
                  status: 'ACTIVE',
                },
              ]),
        ),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    const service = new RelationPickerService(prisma as never);

    const result = await service.search(
      query({ selectedIds: ['archived-asset'] }),
    );

    expect(result.items.map((item) => item.id)).toEqual(['active-asset']);
    expect(result.selectedItems).toEqual([
      expect.objectContaining({
        id: 'archived-asset',
        archived: true,
        lifecycle: 'ARCHIVED',
      }),
    ]);
    expect(JSON.stringify(prisma.asset.findMany.mock.calls)).toContain(
      '"status":{"not":"ARCHIVED"}',
    );
  });

  it('accepts the returned cursor and rejects malformed cursors', async () => {
    const prisma = {
      application: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(26),
      },
    };
    const service = new RelationPickerService(prisma as never);
    const first = await service.search(
      query({ kind: RelationPickerResourceKind.APPLICATIONS, pageSize: 25 }),
    );
    expect(first.nextCursor).toBeTruthy();

    const second = await service.search(
      query({
        kind: RelationPickerResourceKind.APPLICATIONS,
        cursor: first.nextCursor ?? undefined,
        pageSize: 25,
      }),
    );
    expect(second.page).toBe(2);

    await expect(
      service.search(
        query({
          kind: RelationPickerResourceKind.APPLICATIONS,
          cursor: 'not-a-valid-cursor',
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('supports an explicit archived lifecycle filter for audit/history consumers', async () => {
    const prisma = {
      application: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const service = new RelationPickerService(prisma as never);

    await service.search(
      query({
        kind: RelationPickerResourceKind.APPLICATIONS,
        lifecycle: RelationPickerLifecycleFilter.ARCHIVED,
      }),
    );

    expect(JSON.stringify(prisma.application.findMany.mock.calls)).toContain(
      '"status":"ARCHIVED"',
    );
  });
});
