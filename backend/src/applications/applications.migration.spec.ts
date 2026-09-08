import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Application Access integrity migration', () => {
  it('backfills only derivable ownership and reports ambiguous rows', () => {
    const migration = readFileSync(
      resolve(
        __dirname,
        '../../prisma/migrations/20260908100000_application_access_integrity/migration.sql',
      ),
      'utf8',
    );

    expect(migration).toContain(
      'SET "applicationId" = environment."applicationId"',
    );
    expect(migration).toContain('ApplicationAccess ownership backfill blocked');
    expect(migration).toContain(
      'ApplicationAccess primary backfill is ambiguous',
    );
    expect(migration).toContain(
      'Choose the intended primary access explicitly',
    );
    expect(migration).toContain('ALTER COLUMN "applicationId" SET NOT NULL');
    expect(migration).toContain('ALTER COLUMN "environmentId" SET NOT NULL');
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "ApplicationAccess_one_primary_per_environment_idx"',
    );
    expect(migration).not.toContain('encryptedPassword');
    expect(migration).not.toContain('password');
  });
});
