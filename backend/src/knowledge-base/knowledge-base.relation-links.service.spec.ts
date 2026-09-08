import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeBaseService } from './knowledge-base.service';

const documentWithLinks = {
  id: 'document-1',
  title: 'Operations runbook',
  categoryId: 'category-1',
  category: { id: 'category-1', name: 'Operations', icon: 'book' },
  authorId: 'user-1',
  author: { id: 'user-1', displayName: 'Admin', username: 'admin' },
  content: '# Runbook',
  viewCount: 0,
  createdAt: new Date('2026-09-08T00:00:00Z'),
  updatedAt: new Date('2026-09-08T00:00:00Z'),
  applicationLinks: [
    { application: { id: 'application-1', name: 'Payments' } },
  ],
  assetLinks: [
    { asset: { id: 'asset-201', name: 'Asset 201', assetId: 'INV-0201' } },
  ],
  vmLinks: [
    { vm: { id: 'vm-1001', systemName: 'vm-1001', primaryIp: '10.0.0.1001' } },
  ],
  databaseLinks: [
    {
      database: {
        id: 'database-201',
        name: 'Database 201',
        engine: 'PostgreSQL',
      },
    },
  ],
};

describe('KnowledgeBaseService document inventory links', () => {
  it('creates all canonical inventory link sets without accepting secret fields', async () => {
    const create = jest.fn().mockResolvedValue(documentWithLinks);
    const auditCreate = jest.fn().mockResolvedValue({});
    const service = new KnowledgeBaseService({
      knowledgeDocument: { create },
      auditLog: { create: auditCreate },
    } as unknown as PrismaService);

    const result = await service.createDocument({
      title: documentWithLinks.title,
      content: documentWithLinks.content,
      categoryId: documentWithLinks.categoryId,
      authorId: documentWithLinks.authorId,
      applicationIds: ['application-1'],
      assetIds: ['asset-201'],
      vmIds: ['vm-1001'],
      databaseIds: ['database-201'],
      // A hostile caller must not be able to turn relation options into a
      // credential transport. This property is intentionally not in the DTO.
      password: 'must-not-be-forwarded',
    } as never);

    type CreateCall = { data?: Record<string, unknown> };
    const createCalls = create.mock.calls as unknown as Array<[CreateCall]>;
    const createCall = createCalls[0]?.[0];
    expect(createCall.data).toEqual(
      expect.objectContaining({
        applicationLinks: { create: [{ applicationId: 'application-1' }] },
        assetLinks: { create: [{ assetId: 'asset-201' }] },
        vmLinks: { create: [{ vmId: 'vm-1001' }] },
        databaseLinks: { create: [{ databaseId: 'database-201' }] },
      }),
    );
    expect(JSON.stringify(create.mock.calls)).not.toMatch(
      /password|username|credential|secret/i,
    );
    expect(result.applicationLinks[0]?.application.id).toBe('application-1');
    expect(result.assetLinks[0]?.asset.id).toBe('asset-201');
    expect(result.vmLinks[0]?.vm.id).toBe('vm-1001');
    expect(result.databaseLinks[0]?.database.id).toBe('database-201');
  });

  it('replaces and returns every selected canonical link set on edit', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    const update = jest.fn().mockResolvedValue(documentWithLinks);
    const auditCreate = jest.fn().mockResolvedValue({});
    const tx = {
      knowledgeDocumentApplication: { deleteMany },
      knowledgeDocumentAsset: { deleteMany },
      knowledgeDocumentVm: { deleteMany },
      knowledgeDocumentDatabase: { deleteMany },
      knowledgeDocument: { update },
    };
    const service = new KnowledgeBaseService({
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
      auditLog: { create: auditCreate },
    } as unknown as PrismaService);

    const result = await service.updateDocument(
      'document-1',
      {
        title: documentWithLinks.title,
        content: documentWithLinks.content,
        categoryId: documentWithLinks.categoryId,
        applicationIds: ['application-1'],
        assetIds: ['asset-201'],
        vmIds: ['vm-1001'],
        databaseIds: ['database-201'],
      },
      'user-1',
    );

    expect(deleteMany).toHaveBeenCalledTimes(4);
    type UpdateCall = { where?: unknown; data?: Record<string, unknown> };
    const updateCalls = update.mock.calls as unknown as Array<[UpdateCall]>;
    const updateCall = updateCalls[0]?.[0];
    expect(updateCall.where).toEqual({ id: 'document-1' });
    expect(updateCall.data).toEqual(
      expect.objectContaining({
        applicationLinks: { create: [{ applicationId: 'application-1' }] },
        assetLinks: { create: [{ assetId: 'asset-201' }] },
        vmLinks: { create: [{ vmId: 'vm-1001' }] },
        databaseLinks: { create: [{ databaseId: 'database-201' }] },
      }),
    );
    expect(result.assetLinks[0]?.asset.assetId).toBe('INV-0201');
    expect(result.databaseLinks[0]?.database.engine).toBe('PostgreSQL');
  });
});
