import { PrismaClient } from '@prisma/client';
import {
  collectGoldenDatasetEvidence,
  evaluateGoldenDataset,
  formatVerificationReport,
} from '../src/verification/golden-dataset-verifier';

interface VerifierOptions {
  databaseUrl: string;
  json: boolean;
  allowExplicitMainDbRead: boolean;
}

interface DatabaseTarget {
  host: string;
  database: string;
}

export function parseVerifierArgs(argv: string[]): VerifierOptions {
  let databaseUrl: string | undefined;
  let json = false;
  let allowExplicitMainDbRead = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--json') {
      json = true;
      continue;
    }
    if (argument === '--allow-explicit-main-db-read') {
      allowExplicitMainDbRead = true;
      continue;
    }
    if (argument === '--database-url') {
      databaseUrl = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  if (!databaseUrl) {
    throw new Error(
      'Refusing to run without an explicit --database-url for an isolated acceptance/test database.',
    );
  }

  validateDatabaseUrl(databaseUrl, allowExplicitMainDbRead);
  return { databaseUrl, json, allowExplicitMainDbRead };
}

export function validateDatabaseUrl(
  databaseUrl: string,
  allowExplicitMainDbRead = false,
): DatabaseTarget {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error(
      'The supplied --database-url is not a valid PostgreSQL URL.',
    );
  }

  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error('The supplied --database-url must use PostgreSQL.');
  }
  if (!parsed.hostname || !parsed.pathname || parsed.pathname === '/') {
    throw new Error(
      'The supplied --database-url must include a database name.',
    );
  }

  const database = decodeURIComponent(parsed.pathname.slice(1));
  const looksLikeMainDatabase = new Set([
    'infrapilot_db',
    'main',
    'production',
    'prod',
  ]).has(database.toLowerCase());
  if (looksLikeMainDatabase && !allowExplicitMainDbRead) {
    throw new Error(
      'Refusing a database that looks like the main/production database. Use an isolated acceptance/test database or explicitly pass --allow-explicit-main-db-read for this read-only verifier.',
    );
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run the verifier with NODE_ENV=production.');
  }

  return { host: parsed.hostname, database };
}

async function run(argv: string[]): Promise<number> {
  const options = parseVerifierArgs(argv);
  const target = validateDatabaseUrl(
    options.databaseUrl,
    options.allowExplicitMainDbRead,
  );
  process.env.DATABASE_URL = options.databaseUrl;
  const prisma = new PrismaClient();

  try {
    const evidence = await collectGoldenDatasetEvidence(prisma);
    const report = evaluateGoldenDataset(evidence);
    if (options.json) {
      console.log(JSON.stringify({ target, report }, null, 2));
    } else {
      console.log(formatVerificationReport(report, target));
    }
    return report.passed ? 0 : 1;
  } catch {
    console.error(
      'Golden dataset verifier could not read the supplied database. No write operation was attempted.',
    );
    return 2;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  run(process.argv.slice(2))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      console.error(
        error instanceof Error
          ? error.message
          : 'Golden dataset verifier could not start.',
      );
      process.exitCode = 2;
    });
}
