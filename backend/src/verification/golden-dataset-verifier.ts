import { PrismaClient } from '@prisma/client';

export const GOLDEN_DATASET = {
  applicationName: 'Treasury Registry',
  applicationEnvironment: 'PROD',
  applicationComponents: ['API', 'Web'],
  assetIds: [
    'DEV-ASSET-001',
    'DEV-ASSET-002',
    'DEV-ASSET-003',
    'DEV-ASSET-004',
    'DEV-ASSET-005',
    'DEV-ASSET-006',
    'DEV-ASSET-007',
    'DEV-ASSET-008',
  ],
  inventoryVm: {
    moid: 'vm-12345',
    name: 'vm-prod-01',
    environment: 'PROD',
  },
  incompleteDiscovery: {
    moid: 'vm-e2e-needs-context',
    state: 'NEEDS_CONTEXT',
    missingFields: [
      'Environment',
      'Service Role',
      'Service Purpose',
      'Guest Accounts',
    ],
  },
  database: {
    name: 'Treasury Registry DB',
    environment: 'PROD',
  },
  incompleteDatabase: {
    name: 'db-e2e-needs-context',
  },
} as const;

type EnvironmentName = string | null;

export interface ComponentReference {
  id: string;
  name: string;
  environment: EnvironmentName;
}

export interface PrimaryRelation {
  relationId: string;
  resourceId: string;
  resourceLabel: string;
  component: ComponentReference;
}

export interface ComponentVmRelation extends PrimaryRelation {
  relationType: string;
  vmEnvironment: EnvironmentName;
}

export interface ComponentDatabaseRelation {
  logicalDatabaseId: string;
  logicalDatabaseName: string;
  databaseEnvironment: EnvironmentName;
  component: ComponentReference;
}

export interface DatabaseHostRelation {
  databaseId: string;
  databaseName: string;
  databaseEnvironment: EnvironmentName;
  hostVmId: string;
  hostVmName: string;
  hostVmEnvironment: EnvironmentName;
}

export interface ArchivedResourceRelation {
  kind: 'Asset' | 'VM';
  relationId: string;
  resourceId: string;
  resourceLabel: string;
  component: ComponentReference;
  relationCreatedAt: string;
  resourceUpdatedAt: string;
}

export interface ApplicationAccessEvidence {
  id: string;
  applicationId: string | null;
  environmentId: string | null;
  isPrimary: boolean;
  application: { id: string } | null;
  environment: { id: string; applicationId: string } | null;
}

export interface GoldenDatasetEvidence {
  assetPrimaryRelations: PrimaryRelation[];
  vmPrimaryRelations: PrimaryRelation[];
  componentVmRelations: ComponentVmRelation[];
  componentDatabaseRelations: ComponentDatabaseRelation[];
  databaseHostRelations: DatabaseHostRelation[];
  archivedNewRelations: ArchivedResourceRelation[];
  archivedLogicalDatabaseLinks: Array<{
    logicalDatabaseId: string;
    logicalDatabaseName: string;
    component: ComponentReference;
  }>;
  applicationAccess: ApplicationAccessEvidence[];
  fixture: {
    application: {
      found: boolean;
      environment: string | null;
      componentNames: string[];
    };
    assetIds: string[];
    inventoryVm: {
      found: boolean;
      name: string | null;
      environment: string | null;
    };
    incompleteDiscovery: {
      found: boolean;
      state: string | null;
      missingFields: string[];
    };
    database: { found: boolean; environment: string | null };
    incompleteDatabase: { found: boolean; environment: string | null };
  };
}

export interface VerificationCheck {
  name: string;
  passed: boolean;
  count: number;
  details: string[];
}

export interface VerificationReport {
  passed: boolean;
  checks: VerificationCheck[];
  summary: {
    checkCount: number;
    failedCheckCount: number;
    violationCount: number;
  };
}

function componentReference(component: {
  id: string;
  name: string;
  environment: { name: string };
}): ComponentReference {
  return {
    id: component.id,
    name: component.name,
    environment: component.environment.name,
  };
}

export async function collectGoldenDatasetEvidence(
  prisma: PrismaClient,
): Promise<GoldenDatasetEvidence> {
  const [
    assetLinks,
    vmLinks,
    logicalDatabases,
    databases,
    accessRows,
    application,
    assets,
    inventoryVm,
    incompleteDiscovery,
    database,
    incompleteDatabase,
  ] = await Promise.all([
    prisma.applicationComponentAsset.findMany({
      select: {
        id: true,
        assetId: true,
        relationType: true,
        createdAt: true,
        component: {
          select: {
            id: true,
            name: true,
            environment: { select: { name: true } },
          },
        },
        asset: {
          select: {
            id: true,
            assetId: true,
            name: true,
            status: true,
            updatedAt: true,
          },
        },
      },
    }),
    prisma.applicationComponentVm.findMany({
      select: {
        id: true,
        vmId: true,
        relationType: true,
        createdAt: true,
        component: {
          select: {
            id: true,
            name: true,
            environment: { select: { name: true } },
          },
        },
        vm: {
          select: {
            id: true,
            name: true,
            environment: true,
            lifecycleState: true,
            updatedAt: true,
          },
        },
      },
    }),
    prisma.logicalDatabase.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        databaseInventory: { select: { environment: true } },
        components: {
          select: {
            id: true,
            name: true,
            environment: { select: { name: true } },
          },
        },
      },
    }),
    prisma.databaseInventory.findMany({
      where: { hostVmId: { not: null } },
      select: {
        id: true,
        name: true,
        environment: true,
        hostVmId: true,
        hostVm: {
          select: { id: true, name: true, environment: true },
        },
      },
    }),
    prisma.applicationAccess.findMany({
      select: {
        id: true,
        applicationId: true,
        environmentId: true,
        isPrimary: true,
        application: { select: { id: true } },
        environment: { select: { id: true, applicationId: true } },
      },
    }),
    prisma.application.findUnique({
      where: { name: GOLDEN_DATASET.applicationName },
      select: {
        environments: {
          where: { name: GOLDEN_DATASET.applicationEnvironment },
          select: {
            name: true,
            components: { select: { name: true } },
          },
        },
      },
    }),
    prisma.asset.findMany({
      where: { assetId: { in: [...GOLDEN_DATASET.assetIds] } },
      select: { assetId: true },
    }),
    prisma.vmInventory.findFirst({
      where: { moid: GOLDEN_DATASET.inventoryVm.moid },
      select: { name: true, environment: true },
    }),
    prisma.vmDiscovery.findFirst({
      where: { moid: GOLDEN_DATASET.incompleteDiscovery.moid },
      select: { state: true, missingFields: true },
    }),
    prisma.databaseInventory.findFirst({
      where: { name: GOLDEN_DATASET.database.name },
      select: { environment: true },
    }),
    prisma.databaseInventory.findFirst({
      where: { name: GOLDEN_DATASET.incompleteDatabase.name },
      select: { environment: true },
    }),
  ]);

  const assetPrimaryRelations = assetLinks
    .filter((link) => link.relationType === 'PRIMARY')
    .map((link) => ({
      relationId: link.id,
      resourceId: link.assetId,
      resourceLabel: link.asset.assetId ?? link.asset.name,
      component: componentReference(link.component),
    }));

  const vmPrimaryRelations = vmLinks
    .filter((link) => link.relationType === 'PRIMARY')
    .map((link) => ({
      relationId: link.id,
      resourceId: link.vmId,
      resourceLabel: link.vm.name,
      component: componentReference(link.component),
    }));

  const componentVmRelations = vmLinks.map((link) => ({
    relationId: link.id,
    resourceId: link.vmId,
    resourceLabel: link.vm.name,
    component: componentReference(link.component),
    relationType: link.relationType,
    vmEnvironment: link.vm.environment,
  }));

  const componentDatabaseRelations = logicalDatabases.flatMap(
    (logicalDatabase) =>
      logicalDatabase.components.map((component) => ({
        logicalDatabaseId: logicalDatabase.id,
        logicalDatabaseName: logicalDatabase.name,
        databaseEnvironment: logicalDatabase.databaseInventory.environment,
        component: componentReference(component),
      })),
  );

  const databaseHostRelations = databases.flatMap((entry) =>
    entry.hostVm
      ? [
          {
            databaseId: entry.id,
            databaseName: entry.name,
            databaseEnvironment: entry.environment,
            hostVmId: entry.hostVmId as string,
            hostVmName: entry.hostVm.name,
            hostVmEnvironment: entry.hostVm.environment,
          },
        ]
      : [],
  );

  const archivedNewRelations: ArchivedResourceRelation[] = [
    ...assetLinks
      .filter(
        (link) =>
          link.asset.status === 'ARCHIVED' &&
          link.createdAt.getTime() > link.asset.updatedAt.getTime(),
      )
      .map((link) => ({
        kind: 'Asset' as const,
        relationId: link.id,
        resourceId: link.assetId,
        resourceLabel: link.asset.assetId ?? link.asset.name,
        component: componentReference(link.component),
        relationCreatedAt: link.createdAt.toISOString(),
        resourceUpdatedAt: link.asset.updatedAt.toISOString(),
      })),
    ...vmLinks
      .filter(
        (link) =>
          link.vm.lifecycleState === 'ARCHIVED' &&
          link.createdAt.getTime() > link.vm.updatedAt.getTime(),
      )
      .map((link) => ({
        kind: 'VM' as const,
        relationId: link.id,
        resourceId: link.vmId,
        resourceLabel: link.vm.name,
        component: componentReference(link.component),
        relationCreatedAt: link.createdAt.toISOString(),
        resourceUpdatedAt: link.vm.updatedAt.toISOString(),
      })),
  ];

  const archivedLogicalDatabaseLinks = logicalDatabases.flatMap(
    (logicalDatabase) =>
      logicalDatabase.status === 'ARCHIVED'
        ? logicalDatabase.components.map((component) => ({
            logicalDatabaseId: logicalDatabase.id,
            logicalDatabaseName: logicalDatabase.name,
            component: componentReference(component),
          }))
        : [],
  );

  return {
    assetPrimaryRelations,
    vmPrimaryRelations,
    componentVmRelations,
    componentDatabaseRelations,
    databaseHostRelations,
    archivedNewRelations,
    archivedLogicalDatabaseLinks,
    applicationAccess: accessRows,
    fixture: {
      application: {
        found: Boolean(application?.environments[0]),
        environment: application?.environments[0]?.name ?? null,
        componentNames:
          application?.environments[0]?.components.map(
            (component) => component.name,
          ) ?? [],
      },
      assetIds: assets.flatMap((asset) =>
        asset.assetId ? [asset.assetId] : [],
      ),
      inventoryVm: {
        found: Boolean(inventoryVm),
        name: inventoryVm?.name ?? null,
        environment: inventoryVm?.environment ?? null,
      },
      incompleteDiscovery: {
        found: Boolean(incompleteDiscovery),
        state: incompleteDiscovery?.state ?? null,
        missingFields: incompleteDiscovery?.missingFields ?? [],
      },
      database: {
        found: Boolean(database),
        environment: database?.environment ?? null,
      },
      incompleteDatabase: {
        found: Boolean(incompleteDatabase),
        environment: incompleteDatabase?.environment ?? null,
      },
    },
  };
}

function duplicateRelations(relations: PrimaryRelation[]) {
  const byResource = new Map<string, PrimaryRelation[]>();
  for (const relation of relations) {
    const existing = byResource.get(relation.resourceId) ?? [];
    existing.push(relation);
    byResource.set(relation.resourceId, existing);
  }

  return [...byResource.values()].filter((group) => group.length > 1);
}

function mismatchDetails(
  relations: Array<{
    resourceLabel: string;
    component: ComponentReference;
    resourceEnvironment: EnvironmentName;
  }>,
) {
  return relations
    .filter(
      (relation) =>
        relation.component.environment !== null &&
        relation.resourceEnvironment !== null &&
        relation.component.environment !== relation.resourceEnvironment,
    )
    .map(
      (relation) =>
        `${relation.component.name} (${relation.component.environment}) -> ${relation.resourceLabel} (${relation.resourceEnvironment})`,
    );
}

function accessOwnershipProblems(rows: ApplicationAccessEvidence[]) {
  return rows.filter(
    (row) =>
      !row.applicationId ||
      !row.environmentId ||
      !row.application ||
      !row.environment ||
      row.application.id !== row.applicationId ||
      row.environment.id !== row.environmentId ||
      row.environment.applicationId !== row.applicationId,
  );
}

export function evaluateGoldenDataset(
  evidence: GoldenDatasetEvidence,
): VerificationReport {
  const duplicateAssetGroups = duplicateRelations(
    evidence.assetPrimaryRelations,
  );
  const duplicateVmGroups = duplicateRelations(evidence.vmPrimaryRelations);
  const componentVmMismatches = mismatchDetails(
    evidence.componentVmRelations.map((relation) => ({
      resourceLabel: relation.resourceLabel,
      component: relation.component,
      resourceEnvironment: relation.vmEnvironment,
    })),
  );
  const componentDatabaseMismatches = mismatchDetails(
    evidence.componentDatabaseRelations.map((relation) => ({
      resourceLabel: relation.logicalDatabaseName,
      component: relation.component,
      resourceEnvironment: relation.databaseEnvironment,
    })),
  );
  const databaseHostMismatches = evidence.databaseHostRelations
    .filter(
      (relation) =>
        relation.databaseEnvironment !== null &&
        relation.hostVmEnvironment !== null &&
        relation.databaseEnvironment !== relation.hostVmEnvironment,
    )
    .map(
      (relation) =>
        `${relation.databaseName} (${relation.databaseEnvironment}) -> ${relation.hostVmName} (${relation.hostVmEnvironment})`,
    );
  const ownershipProblems = accessOwnershipProblems(evidence.applicationAccess);
  const accessByEnvironment = new Map<
    string,
    { total: number; primary: number }
  >();
  for (const access of evidence.applicationAccess) {
    if (!access.environmentId) continue;
    const current = accessByEnvironment.get(access.environmentId) ?? {
      total: 0,
      primary: 0,
    };
    current.total += 1;
    if (access.isPrimary) current.primary += 1;
    accessByEnvironment.set(access.environmentId, current);
  }
  const duplicatePrimaryAccessEnvironments = [...accessByEnvironment.entries()]
    .filter(([, value]) => value.primary > 1)
    .map(([environmentId]) => environmentId);
  const ambiguousPrimaryAccessEnvironments = [...accessByEnvironment.entries()]
    .filter(([, value]) => value.primary !== 1)
    .map(([environmentId]) => environmentId);

  const fixture = evidence.fixture;
  const missingAssetFixtures = GOLDEN_DATASET.assetIds.filter(
    (assetId) => !fixture.assetIds.includes(assetId),
  );
  const missingComponents = GOLDEN_DATASET.applicationComponents.filter(
    (name) => !fixture.application.componentNames.includes(name),
  );
  const fixtureProblems = [
    ...(fixture.application.found &&
    fixture.application.environment === GOLDEN_DATASET.applicationEnvironment
      ? []
      : ['Treasury Registry PROD environment']),
    ...missingComponents.map((name) => `Treasury Registry component ${name}`),
    ...missingAssetFixtures.map((assetId) => `asset ${assetId}`),
    ...(fixture.inventoryVm.found &&
    fixture.inventoryVm.name === GOLDEN_DATASET.inventoryVm.name &&
    fixture.inventoryVm.environment === GOLDEN_DATASET.inventoryVm.environment
      ? []
      : ['vm-prod-01 PROD inventory fixture']),
    ...(fixture.incompleteDiscovery.found &&
    fixture.incompleteDiscovery.state ===
      GOLDEN_DATASET.incompleteDiscovery.state &&
    GOLDEN_DATASET.incompleteDiscovery.missingFields.every((field) =>
      fixture.incompleteDiscovery.missingFields.includes(field),
    )
      ? []
      : ['vm-e2e-needs-context Data Quality fixture']),
    ...(fixture.database.found &&
    fixture.database.environment === GOLDEN_DATASET.database.environment
      ? []
      : ['Treasury Registry DB PROD fixture']),
    ...(fixture.incompleteDatabase.found &&
    fixture.incompleteDatabase.environment === null
      ? []
      : ['db-e2e-needs-context intentionally incomplete fixture']),
  ];

  const checks: VerificationCheck[] = [
    {
      name: 'duplicate Primary Asset relationships',
      passed: duplicateAssetGroups.length === 0,
      count: duplicateAssetGroups.length,
      details: [
        `inspected ${evidence.assetPrimaryRelations.length} PRIMARY links`,
        ...duplicateAssetGroups.map(
          (group) => `${group[0].resourceLabel}: ${group.length} PRIMARY links`,
        ),
      ],
    },
    {
      name: 'duplicate Primary VM relationships',
      passed: duplicateVmGroups.length === 0,
      count: duplicateVmGroups.length,
      details: [
        `inspected ${evidence.vmPrimaryRelations.length} PRIMARY links`,
        ...duplicateVmGroups.map(
          (group) => `${group[0].resourceLabel}: ${group.length} PRIMARY links`,
        ),
      ],
    },
    {
      name: 'Component to VM environment compatibility',
      passed: componentVmMismatches.length === 0,
      count: componentVmMismatches.length,
      details: componentVmMismatches,
    },
    {
      name: 'Component to Logical Database environment compatibility',
      passed: componentDatabaseMismatches.length === 0,
      count: componentDatabaseMismatches.length,
      details: componentDatabaseMismatches,
    },
    {
      name: 'Database to Host VM environment compatibility',
      passed: databaseHostMismatches.length === 0,
      count: databaseHostMismatches.length,
      details: databaseHostMismatches,
    },
    {
      name: 'newly-linked archived resources',
      passed: evidence.archivedNewRelations.length === 0,
      count: evidence.archivedNewRelations.length,
      details: [
        ...evidence.archivedNewRelations.map(
          (relation) =>
            `${relation.kind} ${relation.resourceLabel} linked to ${relation.component.name} after archive`,
        ),
        ...(evidence.archivedLogicalDatabaseLinks.length > 0
          ? [
              `${evidence.archivedLogicalDatabaseLinks.length} archived Logical Database link(s) found; implicit relation tables have no link timestamp, so newly-linked state cannot be classified`,
            ]
          : []),
      ],
    },
    {
      name: 'Application Access ownership',
      passed: ownershipProblems.length === 0,
      count: ownershipProblems.length,
      details: ownershipProblems.map(
        (row) =>
          `access ${row.id}: Application/Environment ownership is incomplete or inconsistent`,
      ),
    },
    {
      name: 'duplicate Primary Application Access per Environment',
      passed: duplicatePrimaryAccessEnvironments.length === 0,
      count: duplicatePrimaryAccessEnvironments.length,
      details: duplicatePrimaryAccessEnvironments.map(
        (environmentId) => `${environmentId}: more than one PRIMARY access`,
      ),
    },
    {
      name: 'ambiguous Primary Application Access per Environment',
      passed: ambiguousPrimaryAccessEnvironments.length === 0,
      count: ambiguousPrimaryAccessEnvironments.length,
      details: ambiguousPrimaryAccessEnvironments.map(
        (environmentId) =>
          `${environmentId}: expected exactly one PRIMARY access`,
      ),
    },
    {
      name: 'deterministic Data Quality and acceptance fixtures',
      passed: fixtureProblems.length === 0,
      count: fixtureProblems.length,
      details: [
        ...fixtureProblems.map((problem) => `missing or changed: ${problem}`),
        `intentionally incomplete fixtures are expected and excluded from integrity failures: ${fixture.incompleteDiscovery.found ? 'VM discovery present' : 'VM discovery missing'}, ${fixture.incompleteDatabase.found ? 'Database present' : 'Database missing'}`,
      ],
    },
  ];

  const failedChecks = checks.filter((check) => !check.passed);
  return {
    passed: failedChecks.length === 0,
    checks,
    summary: {
      checkCount: checks.length,
      failedCheckCount: failedChecks.length,
      violationCount: checks.reduce((total, check) => total + check.count, 0),
    },
  };
}

export function formatVerificationReport(
  report: VerificationReport,
  target?: { host: string; database: string },
): string {
  const lines = [
    `Golden dataset invariant verifier: ${report.passed ? 'PASS' : 'FAIL'}`,
    ...(target
      ? [`Database target: ${target.host}/${target.database} (read-only)`]
      : []),
  ];
  for (const check of report.checks) {
    lines.push(
      `[${check.passed ? 'PASS' : 'FAIL'}] ${check.name}: ${check.count}`,
    );
    for (const detail of check.details) lines.push(`  - ${detail}`);
  }
  lines.push(
    `Summary: ${report.summary.checkCount} checks, ${report.summary.failedCheckCount} failed, ${report.summary.violationCount} violations`,
  );
  return lines.join('\n');
}
