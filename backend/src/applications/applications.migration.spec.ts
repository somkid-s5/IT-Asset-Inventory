import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Application Access integrity migration', () => {
  const readMigration = () =>
    readFileSync(
      resolve(
        __dirname,
        '../../prisma/migrations/20260908100000_application_access_integrity/migration.sql',
      ),
      'utf8',
    );

  it('backfills only derivable ownership and reports ambiguous primary rows', () => {
    const migration = readMigration();

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
    expect(migration).toContain('RAISE WARNING');
    expect(migration).not.toMatch(
      /RAISE EXCEPTION\s+'ApplicationAccess primary backfill is ambiguous/,
    );
    expect(migration).toContain('ALTER COLUMN "applicationId" SET NOT NULL');
    expect(migration).toContain('ALTER COLUMN "environmentId" SET NOT NULL');
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "ApplicationAccess_one_primary_per_environment_idx"',
    );
    expect(migration).not.toContain('encryptedPassword');
    expect(migration).not.toContain('password');
  });

  it('preserves every valid access row with deterministic ordering and no guessed primary', () => {
    const migration = readMigration();
    const rankingUpdateStart = migration.indexOf('WITH ranked AS');
    const rankingUpdateEnd = migration.indexOf(
      'ALTER TABLE "ApplicationAccess"',
      rankingUpdateStart,
    );
    const rankingUpdate = migration.slice(rankingUpdateStart, rankingUpdateEnd);

    expect(migration).toContain(
      'ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT FALSE',
    );
    expect(migration).toContain('HAVING COUNT(*) > 1');
    expect(migration).toContain('ORDER BY "createdAt" ASC, "id" ASC');
    expect(rankingUpdate).toContain('"sortOrder" = ranked."sortOrder"');
    expect(rankingUpdate).not.toContain('"isPrimary" = TRUE');
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "ApplicationAccess_one_primary_per_environment_idx"',
    );
    expect(migration).toContain('WHERE "isPrimary" = TRUE');
  });
});
