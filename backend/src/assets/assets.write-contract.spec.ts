import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

describe('Asset write contract', () => {
  async function validateWithStrictWhitelist<T extends object>(
    dtoClass: new () => T,
    payload: Record<string, unknown>,
  ) {
    return validate(plainToInstance(dtoClass, payload), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
  }

  it('rejects legacy top-level environment and manageType writes', async () => {
    for (const dtoClass of [CreateAssetDto, UpdateAssetDto]) {
      const environmentErrors = await validateWithStrictWhitelist(dtoClass, {
        environment: 'PROD',
      });
      const manageTypeErrors = await validateWithStrictWhitelist(dtoClass, {
        manageType: 'SSH',
      });

      expect(environmentErrors.map((error) => error.property)).toContain(
        'environment',
      );
      expect(manageTypeErrors.map((error) => error.property)).toContain(
        'manageType',
      );
    }
  });

  it('keeps method on each Access Point as the supported write field', async () => {
    const errors = await validateWithStrictWhitelist(UpdateAssetDto, {
      ips: [{ address: '192.0.2.10', manageType: 'SSH' }],
    });

    expect(errors).toHaveLength(0);
  });
});
