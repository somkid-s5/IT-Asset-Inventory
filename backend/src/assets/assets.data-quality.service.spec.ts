import { AssetStatus, AssetType } from '@prisma/client';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from './assets.service';

describe('AssetsService Data Quality contract', () => {
  it('keeps expired warranty operational instead of lowering context completeness', async () => {
    const prisma = {
      asset: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'asset-1',
            assetId: 'ASSET-001',
            name: 'db-prod-01',
            type: AssetType.SERVER,
            status: AssetStatus.ACTIVE,
            owner: 'db-team',
            location: 'Bangkok DC1',
            sn: 'SN-001',
            warrantyExpiration: new Date('2025-01-01T00:00:00Z'),
            ipAllocations: [{ id: 'ip-1' }],
          },
        ]),
      },
    } as unknown as PrismaService;
    const service = new AssetsService(prisma, {} as CredentialsService);

    const summary = await service.getDataQualitySummary();

    expect(summary.issueCount).toBe(0);
    expect(summary.completeAssets).toBe(1);
    expect(summary.operationalIssueCount).toBe(1);
    expect(summary.operationalIssues[0]).toMatchObject({
      id: 'asset-1',
      issues: ['expired warranty'],
    });
  });
});
