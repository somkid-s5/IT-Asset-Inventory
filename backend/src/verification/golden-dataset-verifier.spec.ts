import {
  GOLDEN_DATASET,
  GoldenDatasetEvidence,
  evaluateGoldenDataset,
  formatVerificationReport,
} from './golden-dataset-verifier';

function cleanEvidence(): GoldenDatasetEvidence {
  const component = {
    id: 'component-prod-web',
    name: 'Web',
    environment: 'PROD',
  };
  return {
    assetPrimaryRelations: [
      {
        relationId: 'asset-link-1',
        resourceId: 'asset-1',
        resourceLabel: 'DEV-ASSET-004',
        component,
      },
    ],
    vmPrimaryRelations: [
      {
        relationId: 'vm-link-1',
        resourceId: 'vm-1',
        resourceLabel: 'vm-prod-01',
        component,
      },
    ],
    componentVmRelations: [
      {
        relationId: 'vm-link-1',
        resourceId: 'vm-1',
        resourceLabel: 'vm-prod-01',
        component,
        relationType: 'PRIMARY',
        vmEnvironment: 'PROD',
      },
    ],
    componentDatabaseRelations: [
      {
        logicalDatabaseId: 'logical-1',
        logicalDatabaseName: 'registry',
        databaseEnvironment: 'PROD',
        component,
      },
    ],
    databaseHostRelations: [
      {
        databaseId: 'database-1',
        databaseName: 'Treasury Registry DB',
        databaseEnvironment: 'PROD',
        hostVmId: 'vm-1',
        hostVmName: 'vm-prod-01',
        hostVmEnvironment: 'PROD',
      },
    ],
    archivedNewRelations: [],
    archivedLogicalDatabaseLinks: [],
    applicationAccess: [],
    fixture: {
      application: {
        found: true,
        environment: 'PROD',
        componentNames: [...GOLDEN_DATASET.applicationComponents],
      },
      assetIds: [...GOLDEN_DATASET.assetIds],
      inventoryVm: { found: true, name: 'vm-prod-01', environment: 'PROD' },
      incompleteDiscovery: {
        found: true,
        state: 'NEEDS_CONTEXT',
        missingFields: [...GOLDEN_DATASET.incompleteDiscovery.missingFields],
      },
      database: { found: true, environment: 'PROD' },
      incompleteDatabase: { found: true, environment: null },
    },
  };
}

describe('golden dataset invariant verifier', () => {
  it('passes clean acceptance evidence and excludes intentional incomplete fixtures', () => {
    const report = evaluateGoldenDataset(cleanEvidence());

    expect(report.passed).toBe(true);
    expect(report.summary.failedCheckCount).toBe(0);
    expect(
      report.checks.find(
        (check) =>
          check.name === 'deterministic Data Quality and acceptance fixtures',
      ),
    ).toMatchObject({ passed: true, count: 0 });
  });

  it('reports relationship violations with safe remediation identifiers', () => {
    const evidence = cleanEvidence();
    evidence.assetPrimaryRelations.push({
      relationId: 'asset-link-2',
      resourceId: 'asset-1',
      resourceLabel: 'DEV-ASSET-004',
      component: { id: 'component-prod-api', name: 'API', environment: 'PROD' },
    });
    evidence.vmPrimaryRelations.push({
      relationId: 'vm-link-2',
      resourceId: 'vm-1',
      resourceLabel: 'vm-prod-01',
      component: { id: 'component-prod-api', name: 'API', environment: 'PROD' },
    });
    evidence.componentVmRelations[0].vmEnvironment = 'UAT';
    evidence.componentDatabaseRelations[0].databaseEnvironment = 'UAT';
    evidence.databaseHostRelations[0].hostVmEnvironment = 'UAT';
    evidence.archivedNewRelations.push({
      kind: 'VM',
      relationId: 'archived-link-1',
      resourceId: 'vm-archived',
      resourceLabel: 'vm-archived',
      component: evidence.componentVmRelations[0].component,
      relationCreatedAt: '2026-09-08T01:00:00.000Z',
      resourceUpdatedAt: '2026-09-08T00:00:00.000Z',
    });
    evidence.applicationAccess.push({
      id: 'access-1',
      applicationId: 'app-1',
      environmentId: 'env-1',
      isPrimary: true,
      application: { id: 'app-other' },
      environment: { id: 'env-1', applicationId: 'app-other' },
    });

    const report = evaluateGoldenDataset(evidence);
    const output = formatVerificationReport(report);

    expect(report.passed).toBe(false);
    expect(output).toContain('DEV-ASSET-004');
    expect(output).toContain('vm-prod-01');
    expect(output).toContain('access-1');
    expect(output).not.toContain('encryptedPassword');
    expect(output).not.toContain('secret-token');
  });

  it('treats a missing environment on an intentionally incomplete database as unknown', () => {
    const evidence = cleanEvidence();
    evidence.databaseHostRelations.push({
      databaseId: 'database-incomplete',
      databaseName: 'db-e2e-needs-context',
      databaseEnvironment: null,
      hostVmId: 'vm-1',
      hostVmName: 'vm-prod-01',
      hostVmEnvironment: 'PROD',
    });

    const report = evaluateGoldenDataset(evidence);

    expect(report.passed).toBe(true);
    expect(
      report.checks.find(
        (check) =>
          check.name === 'Database to Host VM environment compatibility',
      ),
    ).toMatchObject({ passed: true, count: 0 });
  });

  it('checks both duplicate and missing Primary Application Access per Environment', () => {
    const evidence = cleanEvidence();
    evidence.applicationAccess = [
      {
        id: 'access-primary-1',
        applicationId: 'app-1',
        environmentId: 'env-prod',
        isPrimary: true,
        application: { id: 'app-1' },
        environment: { id: 'env-prod', applicationId: 'app-1' },
      },
      {
        id: 'access-primary-2',
        applicationId: 'app-1',
        environmentId: 'env-prod',
        isPrimary: true,
        application: { id: 'app-1' },
        environment: { id: 'env-prod', applicationId: 'app-1' },
      },
      {
        id: 'access-secondary-only',
        applicationId: 'app-1',
        environmentId: 'env-uat',
        isPrimary: false,
        application: { id: 'app-1' },
        environment: { id: 'env-uat', applicationId: 'app-1' },
      },
    ];

    const report = evaluateGoldenDataset(evidence);
    const duplicateCheck = report.checks.find(
      (check) =>
        check.name === 'duplicate Primary Application Access per Environment',
    );
    const ambiguousCheck = report.checks.find(
      (check) =>
        check.name === 'ambiguous Primary Application Access per Environment',
    );

    expect(duplicateCheck).toMatchObject({ passed: false, count: 1 });
    expect(ambiguousCheck).toMatchObject({ passed: false, count: 2 });
  });
});
