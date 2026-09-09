import {
  AssetStatus,
  AssetType,
  AuditAction,
  DatabaseStatus,
  PrismaClient,
  VmCriticality,
  VmDiscoveryState,
  VmEnvironment,
  VmLifecycleState,
  VmPowerState,
  VmSourceStatus,
} from '@prisma/client';

export const DENSE_FIXTURE_COUNTS = {
  assets: 225,
  databases: 225,
  vmInventory: 1025,
  vmDiscoveries: 1025,
  auditLogs: 125,
} as const;

export const DENSE_FIXTURE_MARKER = 'T16-DENSE-RELEASE';
const ACCEPTANCE_DATABASE_NAME =
  /(?:^|[_-])(acceptance|test|dense|qa)(?:$|[_-])/i;
const RESERVED_DATABASE_NAMES = new Set([
  'infrapilot_db',
  'main',
  'production',
  'prod',
  'postgres',
]);

export interface DenseDatabaseTarget {
  host: string;
  database: string;
}

export interface DenseFixtureOptions {
  databaseUrl: string;
  json: boolean;
}

export function validateDenseDatabaseUrl(
  databaseUrl: string,
): DenseDatabaseTarget {
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
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Refusing to generate a dense fixture with NODE_ENV=production.',
    );
  }

  const database = decodeURIComponent(parsed.pathname.slice(1));
  if (RESERVED_DATABASE_NAMES.has(database.toLowerCase())) {
    throw new Error(
      'Refusing to generate a dense fixture against a main/production database. Use an explicitly named acceptance, test, dense, or QA database.',
    );
  }
  if (!ACCEPTANCE_DATABASE_NAME.test(database)) {
    throw new Error(
      'Refusing to generate a dense fixture unless the database name explicitly contains acceptance, test, dense, or qa.',
    );
  }

  return { host: parsed.hostname, database };
}

export function parseDenseFixtureArgs(argv: string[]): DenseFixtureOptions {
  let databaseUrl: string | undefined;
  let json = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--json') {
      json = true;
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
  validateDenseDatabaseUrl(databaseUrl);
  return { databaseUrl, json };
}

function stableId(namespace: string, index: number): string {
  const value = `${namespace}:${index.toString().padStart(4, '0')}`;
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  const hex = `${hash.toString(16).padStart(8, '0')}${index
    .toString(16)
    .padStart(8, '0')}${namespace.length.toString(16).padStart(8, '0')}`.padEnd(
    32,
    '0',
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function denseAssetId(index: number) {
  return `${DENSE_FIXTURE_MARKER}-ASSET-${index.toString().padStart(3, '0')}`;
}

function denseDatabaseName(index: number) {
  return `${DENSE_FIXTURE_MARKER}-DATABASE-${index.toString().padStart(3, '0')}`;
}

function denseVmName(index: number) {
  return `${DENSE_FIXTURE_MARKER}-VM-${index.toString().padStart(4, '0')}`;
}

function denseDiscoveryName(index: number) {
  return `${DENSE_FIXTURE_MARKER}-DISCOVERY-${index.toString().padStart(4, '0')}`;
}

function denseAuditDetails(index: number) {
  return `${DENSE_FIXTURE_MARKER}-AUDIT-${index.toString().padStart(3, '0')}`;
}

async function findFixtureOwner(prisma: PrismaClient) {
  const owner = await prisma.user.findFirst({
    where: { role: 'ADMIN', deletedAt: null },
    orderBy: { username: 'asc' },
    select: { id: true },
  });
  if (!owner) {
    throw new Error(
      'Dense fixture generation requires a seeded Administrator in the explicitly selected acceptance database.',
    );
  }
  return owner.id;
}

async function resetDenseRows(prisma: PrismaClient) {
  await prisma.auditLog.deleteMany({
    where: { details: { startsWith: DENSE_FIXTURE_MARKER } },
  });
  await prisma.vmInventory.deleteMany({
    where: { name: { startsWith: DENSE_FIXTURE_MARKER } },
  });
  await prisma.vmDiscovery.deleteMany({
    where: { name: { startsWith: DENSE_FIXTURE_MARKER } },
  });
  await prisma.databaseInventory.deleteMany({
    where: { name: { startsWith: DENSE_FIXTURE_MARKER } },
  });
  await prisma.asset.deleteMany({
    where: { assetId: { startsWith: DENSE_FIXTURE_MARKER } },
  });
}

async function generateDenseFixture(prisma: PrismaClient) {
  const createdByUserId = await findFixtureOwner(prisma);
  const sourceId = stableId('t16-source', 1);
  const fixedDate = new Date('2024-01-01T00:00:00.000Z');

  await resetDenseRows(prisma);
  await prisma.vmVCenterSource.upsert({
    where: { id: sourceId },
    create: {
      id: sourceId,
      name: 't16-dense-acceptance-vcenter',
      endpoint: 'https://dense-vcenter.acceptance.invalid',
      version: '8.0',
      syncInterval: 60,
      status: VmSourceStatus.READY_TO_SYNC,
      createdByUserId,
      createdAt: fixedDate,
      updatedAt: fixedDate,
    },
    update: {
      name: 't16-dense-acceptance-vcenter',
      endpoint: 'https://dense-vcenter.acceptance.invalid',
      version: '8.0',
      syncInterval: 60,
      status: VmSourceStatus.READY_TO_SYNC,
      createdByUserId,
    },
  });

  await prisma.asset.createMany({
    data: Array.from({ length: DENSE_FIXTURE_COUNTS.assets }, (_, offset) => {
      const index = offset + 1;
      return {
        id: stableId('t16-asset', index),
        assetId: denseAssetId(index),
        name: denseAssetId(index),
        type: index % 3 === 0 ? AssetType.SWITCH : AssetType.SERVER,
        environment: 'TEST',
        location: 'T16 Dense Acceptance Lab',
        rack: `R-${((index - 1) % 20) + 1}`,
        osVersion: 'Synthetic test image',
        status: AssetStatus.ACTIVE,
        owner: 'T16 Acceptance Operations',
        department: 'Synthetic Fixtures',
        createdByUserId,
        createdAt: fixedDate,
        updatedAt: fixedDate,
      };
    }),
  });

  await prisma.databaseInventory.createMany({
    data: Array.from(
      { length: DENSE_FIXTURE_COUNTS.databases },
      (_, offset) => {
        const index = offset + 1;
        return {
          id: stableId('t16-database', index),
          name: denseDatabaseName(index),
          engine: 'PostgreSQL',
          version: '16',
          environment: 'TEST',
          host: `t16-db-${index.toString().padStart(4, '0')}.acceptance.invalid`,
          ipAddress: `198.18.0.${(index % 254) + 1}`,
          port: '5432',
          serviceName: `t16_dense_${index.toString().padStart(4, '0')}`,
          owner: 'T16 Acceptance DBA',
          backupPolicy: 'Synthetic fixture only',
          linkedApps: [],
          maintenanceWindow: 'Saturday 00:00 UTC',
          status: DatabaseStatus.ACTIVE,
          note: 'Generated isolated Ticket 16 fixture; contains no production data.',
          createdByUserId,
          createdAt: fixedDate,
          updatedAt: fixedDate,
        };
      },
    ),
  });

  await prisma.vmDiscovery.createMany({
    data: Array.from(
      { length: DENSE_FIXTURE_COUNTS.vmDiscoveries },
      (_, offset) => {
        const index = offset + 1;
        const name = denseDiscoveryName(index);
        return {
          id: stableId('t16-discovery', index),
          name,
          systemName: name,
          moid: `t16-discovery-moid-${index.toString().padStart(4, '0')}`,
          sourceId,
          cluster: 'T16-Dense-Cluster',
          host: 't16-esxi.acceptance.invalid',
          guestOs: 'Synthetic Linux',
          primaryIp: `198.19.0.${(index % 254) + 1}`,
          cpuCores: 4,
          memoryGb: 16,
          storageGb: 100,
          networkLabel: 'T16-DENSE',
          powerState: VmPowerState.RUNNING,
          state: VmDiscoveryState.READY_TO_PROMOTE,
          completeness: 100,
          missingFields: [],
          lastSeenAt: fixedDate,
          tags: ['ticket-16', 'synthetic'],
          guestAccountsCount: 0,
          owner: 'T16 Acceptance Operations',
          environment: VmEnvironment.TEST,
          businessUnit: 'Synthetic Fixtures',
          slaTier: 'Standard',
          serviceRole: 'Acceptance Fixture',
          criticality: VmCriticality.STANDARD,
          description: 'Generated isolated Ticket 16 discovery fixture.',
          notes: 'No production data or credentials.',
          createdByUserId,
          createdAt: fixedDate,
          updatedAt: fixedDate,
        };
      },
    ),
  });

  await prisma.vmInventory.createMany({
    data: Array.from(
      { length: DENSE_FIXTURE_COUNTS.vmInventory },
      (_, offset) => {
        const index = offset + 1;
        const name = denseVmName(index);
        return {
          id: stableId('t16-inventory', index),
          discoveryId: stableId('t16-discovery', index),
          sourceId,
          name,
          systemName: name,
          moid: `t16-inventory-moid-${index.toString().padStart(4, '0')}`,
          environment: VmEnvironment.TEST,
          cluster: 'T16-Dense-Cluster',
          host: 't16-esxi.acceptance.invalid',
          guestOs: 'Synthetic Linux',
          primaryIp: `198.20.0.${(index % 254) + 1}`,
          cpuCores: 4,
          memoryGb: 16,
          storageGb: 100,
          networkLabel: 'T16-DENSE',
          powerState: VmPowerState.RUNNING,
          lifecycleState: VmLifecycleState.ACTIVE,
          discoveryState: VmDiscoveryState.READY_TO_PROMOTE,
          syncState: 'Synced',
          owner: 'T16 Acceptance Operations',
          businessUnit: 'Synthetic Fixtures',
          slaTier: 'Standard',
          serviceRole: 'Acceptance Fixture',
          criticality: VmCriticality.STANDARD,
          description: 'Generated isolated Ticket 16 inventory fixture.',
          tags: ['ticket-16', 'synthetic'],
          lastSyncAt: fixedDate,
          syncedFields: [],
          managedFields: [],
          notes: 'No production data or credentials.',
          createdByUserId,
          createdAt: fixedDate,
          updatedAt: fixedDate,
        };
      },
    ),
  });

  await prisma.auditLog.createMany({
    data: Array.from(
      { length: DENSE_FIXTURE_COUNTS.auditLogs },
      (_, offset) => ({
        id: stableId('t16-audit', offset + 1),
        userId: createdByUserId,
        action: AuditAction.UPDATE_ASSET,
        targetId: stableId(
          't16-asset',
          (offset % DENSE_FIXTURE_COUNTS.assets) + 1,
        ),
        details: denseAuditDetails(offset + 1),
        timestamp: new Date(fixedDate.getTime() + offset * 60_000),
      }),
    ),
  });

  return {
    marker: DENSE_FIXTURE_MARKER,
    counts: DENSE_FIXTURE_COUNTS,
    boundaries: {
      asset: { id: stableId('t16-asset', 201), search: denseAssetId(201) },
      database: {
        id: stableId('t16-database', 201),
        search: denseDatabaseName(201),
      },
      vm: { id: stableId('t16-inventory', 1001), search: denseVmName(1001) },
      discovery: {
        id: stableId('t16-discovery', 1001),
        search: denseDiscoveryName(1001),
      },
      audit: { id: stableId('t16-audit', 1), search: denseAuditDetails(1) },
    },
  };
}

async function run(argv: string[]): Promise<number> {
  const options = parseDenseFixtureArgs(argv);
  const target = validateDenseDatabaseUrl(options.databaseUrl);
  process.env.DATABASE_URL = options.databaseUrl;
  const prisma = new PrismaClient();

  try {
    const fixture = await generateDenseFixture(prisma);
    if (options.json) {
      console.log(JSON.stringify({ target, fixture }, null, 2));
    } else {
      console.log(
        `Generated ${fixture.marker} in ${target.host}/${target.database}`,
      );
      console.log(JSON.stringify(fixture.counts));
      console.log(JSON.stringify(fixture.boundaries));
    }
    return 0;
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
