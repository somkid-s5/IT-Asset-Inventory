import 'reflect-metadata';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

describe('SearchController authentication boundary', () => {
  it('keeps Global Search authenticated', () => {
    const handler = Object.getOwnPropertyDescriptor(
      SearchController.prototype,
      'search',
    )?.value as object;

    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).not.toBe(true);
  });

  it('delegates the query without exposing a second anonymous search surface', async () => {
    const search = jest.fn().mockResolvedValue({ applications: [] });
    const controller = new SearchController({
      search,
    } as unknown as SearchService);

    await expect(controller.search('asset-01')).resolves.toEqual({
      applications: [],
    });
    expect(search).toHaveBeenCalledWith('asset-01');
  });
});
