import { PrismaClient } from '@prisma/client';
import {
  DENSE_FIXTURE_COUNTS,
  DENSE_FIXTURE_MARKER,
  parseDenseFixtureArgs,
  validateDenseDatabaseUrl,
} from './generate-dense-fixture';

async function run(argv: string[]): Promise<number> {
  const options = parseDenseFixtureArgs(argv);
  const target = validateDenseDatabaseUrl(options.databaseUrl);
  process.env.DATABASE_URL = options.databaseUrl;
  const prisma = new PrismaClient();

  try {
    const [assets, databases, vmInventory, vmDiscoveries, auditLogs] =
      await Promise.all([
        prisma.asset.count({
          where: { assetId: { startsWith: DENSE_FIXTURE_MARKER } },
        }),
        prisma.databaseInventory.count({
          where: { name: { startsWith: DENSE_FIXTURE_MARKER } },
        }),
        prisma.vmInventory.count({
          where: { name: { startsWith: DENSE_FIXTURE_MARKER } },
        }),
        prisma.vmDiscovery.count({
          where: { name: { startsWith: DENSE_FIXTURE_MARKER } },
        }),
        prisma.auditLog.count({
          where: { details: { startsWith: DENSE_FIXTURE_MARKER } },
        }),
      ]);
    const counts = { assets, databases, vmInventory, vmDiscoveries, auditLogs };
    const passed = Object.entries(DENSE_FIXTURE_COUNTS).every(
      ([key, minimum]) => counts[key as keyof typeof counts] >= minimum,
    );
    const report = {
      target,
      marker: DENSE_FIXTURE_MARKER,
      expectedMinimums: DENSE_FIXTURE_COUNTS,
      counts,
      passed,
    };
    console.log(
      options.json ? JSON.stringify(report, null, 2) : JSON.stringify(report),
    );
    return passed ? 0 : 1;
  } catch (error: unknown) {
    console.error(
      error instanceof Error
        ? `Dense fixture verification could not read the selected database: ${error.message}`
        : 'Dense fixture verification could not read the selected database.',
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
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 2;
    });
}
