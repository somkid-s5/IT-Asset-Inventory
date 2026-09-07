import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeBaseService } from './knowledge-base.service';

type FindUniqueArgs = {
  where: { id: string };
  select?: Record<string, unknown>;
};

describe('KnowledgeBaseService public document contract', () => {
  it('returns a constrained known-link projection without inventory relationships or author username', async () => {
    const captured: FindUniqueArgs[] = [];
    const findUnique = jest.fn((args: FindUniqueArgs) => {
      captured.push(args);
      return Promise.resolve({
        id: 'doc-1',
        title: 'Runbook',
        content: '# Runbook',
        categoryId: 'cat-1',
        category: { id: 'cat-1', name: 'Operations', icon: 'book' },
        author: { displayName: 'Admin User' },
        createdAt: new Date('2026-09-01T00:00:00Z'),
        updatedAt: new Date('2026-09-02T00:00:00Z'),
      });
    });
    const prisma = {
      knowledgeDocument: {
        findUnique,
        update: jest.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaService;
    const service = new KnowledgeBaseService(prisma);

    await expect(service.findPublicDocument('doc-1')).resolves.toMatchObject({
      id: 'doc-1',
      title: 'Runbook',
      author: { displayName: 'Admin User' },
    });

    const select = captured[0]?.select;
    expect(select).toBeDefined();
    expect(select).not.toHaveProperty('applicationLinks');
    expect(select).not.toHaveProperty('assetLinks');
    expect(select).not.toHaveProperty('vmLinks');
    expect(select).not.toHaveProperty('databaseLinks');
    expect(select?.author).toEqual({ select: { displayName: true } });
  });

  it('searches the full authenticated library with a lightweight projection and bounded result size', async () => {
    const captured: Array<{
      where?: unknown;
      take?: number;
      select?: Record<string, unknown>;
    }> = [];
    const findMany = jest.fn(
      (args: {
        where?: unknown;
        take?: number;
        select?: Record<string, unknown>;
      }) => {
        captured.push(args);
        return Promise.resolve([]);
      },
    );
    const prisma = {
      knowledgeDocument: { findMany },
    } as unknown as PrismaService;
    const service = new KnowledgeBaseService(prisma);

    await expect(service.searchDocuments('oracle', 500)).resolves.toEqual([]);

    expect(captured[0]?.take).toBe(100);
    expect(captured[0]?.where).toEqual({
      OR: [
        { title: { contains: 'oracle', mode: 'insensitive' } },
        { content: { contains: 'oracle', mode: 'insensitive' } },
        { category: { name: { contains: 'oracle', mode: 'insensitive' } } },
      ],
    });
    expect(captured[0]?.select).not.toHaveProperty('applicationLinks');
    expect(captured[0]?.select).not.toHaveProperty('assetLinks');
    expect(captured[0]?.select).not.toHaveProperty('vmLinks');
    expect(captured[0]?.select).not.toHaveProperty('databaseLinks');
  });
});
