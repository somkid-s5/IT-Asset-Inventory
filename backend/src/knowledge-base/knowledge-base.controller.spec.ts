import { KnowledgeBaseService } from './knowledge-base.service';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';

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

  it('keeps authenticated document detail private while exposing only the dedicated public known-link handler', () => {
    const authenticatedHandler = Object.getOwnPropertyDescriptor(
      KnowledgeBaseController.prototype,
      'findDocument',
    )?.value as object;
    const publicHandler = Object.getOwnPropertyDescriptor(
      KnowledgeBaseController.prototype,
      'findPublicDocument',
    )?.value as object;
    const enumerationHandlers = [
      'findAllDocuments',
      'searchDocuments',
      'findAllCategories',
      'getRecentDocuments',
    ].map(
      (name) =>
        Object.getOwnPropertyDescriptor(KnowledgeBaseController.prototype, name)
          ?.value as object,
    );

    expect(Reflect.getMetadata(IS_PUBLIC_KEY, authenticatedHandler)).not.toBe(
      true,
    );
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, publicHandler)).toBe(true);
    for (const handler of enumerationHandlers) {
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).not.toBe(true);
    }
  });
});
