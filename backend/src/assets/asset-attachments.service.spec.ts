import * as fs from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import { AssetAttachmentsService } from './asset-attachments.service';

describe('AssetAttachmentsService upload validation', () => {
  const prisma = {
    asset: { findUnique: jest.fn() },
    assetAttachment: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  } as unknown as PrismaService;
  let service: AssetAttachmentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AssetAttachmentsService(prisma);
    prisma.asset.findUnique = jest.fn().mockResolvedValue({ id: 'asset-1' });
  });

  it('rejects SVG before a file is written', async () => {
    const writeFile = jest.spyOn(fs.promises, 'writeFile');
    const file = {
      originalname: 'diagram.svg',
      mimetype: 'image/svg+xml',
      size: 42,
      buffer: Buffer.from('<svg><script>alert(1)</script></svg>'),
    } as Express.Multer.File;

    await expect(
      service.saveAttachment('asset-1', file, 'user-1'),
    ).rejects.toThrow('is not allowed');
    expect(writeFile).not.toHaveBeenCalled();
    writeFile.mockRestore();
  });

  it('rejects a file whose signature does not match its MIME type', async () => {
    const writeFile = jest.spyOn(fs.promises, 'writeFile');
    const file = {
      originalname: 'payload.png',
      mimetype: 'image/png',
      size: 10,
      buffer: Buffer.from('not a PNG'),
    } as Express.Multer.File;

    await expect(
      service.saveAttachment('asset-1', file, 'user-1'),
    ).rejects.toThrow('signature does not match');
    expect(writeFile).not.toHaveBeenCalled();
    writeFile.mockRestore();
  });

  it('uses a server-controlled extension and removes the file if DB write fails', async () => {
    const writeFile = jest
      .spyOn(fs.promises, 'writeFile')
      .mockImplementation(() => Promise.resolve());
    const unlink = jest
      .spyOn(fs.promises, 'unlink')
      .mockImplementation(() => Promise.resolve());
    prisma.assetAttachment.create = jest
      .fn()
      .mockRejectedValue(new Error('database unavailable'));
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const file = {
      originalname: 'payload.php',
      mimetype: 'image/png',
      size: png.length,
      buffer: png,
    } as Express.Multer.File;

    await expect(
      service.saveAttachment('asset-1', file, 'user-1'),
    ).rejects.toThrow('database unavailable');

    expect(writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/\.png$/),
      png,
      { flag: 'wx' },
    );
    expect(unlink).toHaveBeenCalled();
    writeFile.mockRestore();
    unlink.mockRestore();
  });
});
