import { BadRequestException } from '@nestjs/common';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { DatabasesService } from './databases.service';

type EnvironmentInternals = {
  normalizeEnvironment(
    value?: string | null,
    existing?: string | null,
  ): string | null;
};

describe('DatabasesService environment contract', () => {
  const service = new DatabasesService(
    {} as PrismaService,
    {} as CredentialsService,
  ) as unknown as EnvironmentInternals;

  it('normalizes V1 operational environments', () => {
    expect(service.normalizeEnvironment('prod')).toBe('PROD');
    expect(service.normalizeEnvironment(' UAT ')).toBe('UAT');
    expect(service.normalizeEnvironment('test')).toBe('TEST');
  });

  it('rejects a new legacy or unsupported environment', () => {
    expect(() => service.normalizeEnvironment('DEV')).toThrow(
      BadRequestException,
    );
    expect(() => service.normalizeEnvironment('DR')).toThrow(
      'Database environment must be one of PROD, UAT, or TEST.',
    );
  });

  it('preserves an unchanged legacy environment during edit until migration is explicit', () => {
    expect(service.normalizeEnvironment('DEV', 'DEV')).toBe('DEV');
  });
});
