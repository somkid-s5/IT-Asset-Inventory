import { KnowledgeBaseService } from './knowledge-base.service';
import { KnowledgeBaseController } from './knowledge-base.controller';

describe('KnowledgeBaseController uploads', () => {
  let controller: KnowledgeBaseController;

  beforeEach(() => {
    controller = new KnowledgeBaseController({} as KnowledgeBaseService);
  });

  it('rejects SVG uploads before writing a file', async () => {
    const file = {
      mimetype: 'image/svg+xml',
      buffer: Buffer.from('<svg><script>alert(1)</script></svg>'),
    } as Express.Multer.File;

    await expect(controller.uploadImage(file)).rejects.toThrow(
      'SVG is not allowed',
    );
  });

  it('rejects files whose signature does not match the declared MIME type', async () => {
    const file = {
      mimetype: 'image/png',
      buffer: Buffer.from('not a PNG'),
    } as Express.Multer.File;

    await expect(controller.uploadImage(file)).rejects.toThrow(
      'signature does not match',
    );
  });
});
