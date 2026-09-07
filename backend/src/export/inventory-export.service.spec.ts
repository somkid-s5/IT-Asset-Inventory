import XlsxPopulate from 'xlsx-populate';
import { AuditAction } from '@prisma/client';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryExportService } from './inventory-export.service';

const NOW = new Date('2026-09-06T12:00:00.000Z');

function createFixturePrisma() {
  const asset = {
    id: 'asset-1',
    assetId: 'AST-001',
    name: 'server-01',
    type: 'SERVER',
    environment: null,
    status: 'ACTIVE',
    location: 'Bangkok DC1',
    rack: 'R01',
    osVersion: 'Linux',
    manageType: 'SSH',
    brandModel: 'Example Server',
    sn: 'SN-001',
    owner: 'infra-team',
    department: 'IT',
    responsibleParty: 'infra-team',
    vendor: 'Example Vendor',
    purchaseDate: NOW,
    warrantyExpiration: NOW,
    parentId: null,
    parent: null,
    dependencies: null,
    customMetadata: { cpu: '8 cores' },
    patchInfo: null,
    createdAt: NOW,
    updatedAt: NOW,
    ipAllocations: [
      {
        id: 'ip-1',
        address: '10.0.0.10',
        type: 'Management',
        nodeLabel: 'iLO',
        manageType: 'WEB',
        version: '1.0',
        credentialId: null,
        assetId: 'asset-1',
        createdAt: NOW,
        updatedAt: NOW,
        credentialLinks: [
          {
            ipAllocationId: 'ip-1',
            credentialId: 'cred-asset-1',
            createdAt: NOW,
          },
        ],
      },
    ],
    credentials: [
      {
        id: 'cred-asset-1',
        assetId: 'asset-1',
        username: 'asset-admin',
        encryptedPassword: 'enc-asset',
        type: 'WEB',
        nodeLabel: 'iLO',
        manageType: 'WEB',
        version: '1.0',
        lastChangedDate: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
  };

  const application = {
    id: 'app-1',
    name: 'Treasury Registry',
    status: 'ACTIVE',
    technicalOwner: 'app-team',
    businessUnit: 'Treasury',
    description: 'Registry application',
    createdAt: NOW,
    updatedAt: NOW,
    access: [],
    environments: [
      {
        id: 'env-1',
        applicationId: 'app-1',
        name: 'PROD',
        noDatabase: false,
        sortOrder: 0,
        createdAt: NOW,
        updatedAt: NOW,
        access: [
          {
            id: 'access-1',
            applicationId: null,
            environmentId: 'env-1',
            environment: null,
            label: 'Admin Portal',
            address: 'https://registry.internal',
            method: 'HTTPS',
            createdAt: NOW,
            updatedAt: NOW,
            credentials: [
              {
                id: 'cred-app-1',
                accessId: 'access-1',
                username: 'app-admin',
                encryptedPassword: 'enc-app',
                role: 'admin',
                lastChangedDate: NOW,
                createdAt: NOW,
                updatedAt: NOW,
              },
            ],
          },
        ],
        components: [
          {
            id: 'component-1',
            environmentId: 'env-1',
            name: 'Web',
            description: 'Web component',
            sortOrder: 0,
            createdAt: NOW,
            updatedAt: NOW,
            assetLinks: [
              {
                id: 'link-asset-1',
                componentId: 'component-1',
                assetId: 'asset-1',
                relationType: 'PRIMARY',
                responsibleParty: 'app-team',
                createdAt: NOW,
                updatedAt: NOW,
              },
            ],
            vmLinks: [
              {
                id: 'link-vm-1',
                componentId: 'component-1',
                vmId: 'vm-1',
                relationType: 'SHARED',
                responsibleParty: null,
                createdAt: NOW,
                updatedAt: NOW,
              },
            ],
            logicalDatabases: [
              {
                id: 'logical-1',
                name: 'registry',
                databaseInventoryId: 'db-1',
              },
            ],
          },
        ],
      },
    ],
  };

  const database = {
    id: 'db-1',
    name: 'Treasury Registry DB',
    engine: 'Oracle',
    version: '19c',
    environment: 'PROD',
    host: null,
    hostAssetId: null,
    hostAsset: null,
    hostVmId: 'vm-1',
    hostVm: { id: 'vm-1', name: 'vm-prod-01', systemName: 'VM-PROD-01' },
    ipAddress: '10.0.0.20',
    port: '1521',
    serviceName: 'TRREG',
    owner: 'db-team',
    backupPolicy: 'Daily',
    replication: 'Primary',
    linkedApps: [],
    maintenanceWindow: 'Sun 02:00',
    status: 'ACTIVE',
    note: null,
    responsibleParty: 'db-team',
    createdAt: NOW,
    updatedAt: NOW,
    accounts: [
      {
        id: 'db-account-1',
        databaseInventoryId: 'db-1',
        username: 'db-admin',
        role: 'DBA',
        encryptedPassword: 'enc-db',
        privileges: ['CONNECT'],
        note: null,
        scope: 'LOGICAL_DATABASES',
        logicalDatabases: [{ id: 'logical-1', name: 'registry' }],
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    logicalDatabases: [
      {
        id: 'logical-1',
        databaseInventoryId: 'db-1',
        name: 'registry',
        description: 'Registry schema',
        status: 'ACTIVE',
        createdAt: NOW,
        updatedAt: NOW,
        accounts: [],
        components: [
          {
            id: 'component-1',
            name: 'Web',
            environment: {
              id: 'env-1',
              name: 'PROD',
              application: { id: 'app-1', name: 'Treasury Registry' },
            },
          },
        ],
      },
    ],
  };

  const vm = {
    id: 'vm-1',
    name: 'vm-prod-01',
    systemName: 'VM-PROD-01',
    moid: 'vm-101',
    sourceId: 'source-1',
    environment: 'PROD',
    cluster: 'Cluster-01',
    host: 'esxi-01',
    computerName: 'VM-PROD-01',
    guestOs: 'Linux',
    primaryIp: '10.0.0.30',
    cpuCores: 4,
    memoryGb: 16,
    storageGb: 100,
    networkLabel: 'VM Network',
    powerState: 'RUNNING',
    lifecycleState: 'ACTIVE',
    discoveryState: 'READY_TO_PROMOTE',
    syncState: 'SYNCED',
    owner: 'infra-team',
    businessUnit: 'Treasury',
    slaTier: 'Tier-1',
    serviceRole: 'Web Server',
    criticality: 'BUSINESS_CRITICAL',
    responsibleParty: 'infra-team',
    description: 'Production VM',
    tags: ['prod'],
    lastSyncAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    source: {
      id: 'source-1',
      name: 'vcenter-01',
      endpoint: 'https://vcenter.local',
    },
    componentLinks: [],
    guestAccounts: [
      {
        id: 'vm-account-1',
        username: 'vm-admin',
        encryptedPassword: 'enc-vm',
        accessMethod: 'SSH',
        role: 'admin',
        note: null,
      },
    ],
  };

  const source = {
    id: 'source-1',
    name: 'vcenter-01',
    endpoint: 'https://vcenter.local',
    version: '8.0',
    username: 'vc-admin',
    encryptedPassword: 'enc-vc',
    syncInterval: 60,
    status: 'HEALTHY',
    lastSyncAt: NOW,
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
  };

  let capturedAudit:
    | { data: { userId: string; action: AuditAction; details: string } }
    | undefined;
  const auditCreate = jest.fn(
    (args: {
      data: { userId: string; action: AuditAction; details: string };
    }) => {
      capturedAudit = args;
      return Promise.resolve({ id: 'audit-1' });
    },
  );
  const prisma = {
    asset: { findMany: jest.fn().mockResolvedValue([asset]) },
    application: { findMany: jest.fn().mockResolvedValue([application]) },
    databaseInventory: { findMany: jest.fn().mockResolvedValue([database]) },
    vmInventory: { findMany: jest.fn().mockResolvedValue([vm]) },
    vmVCenterSource: { findMany: jest.fn().mockResolvedValue([source]) },
    auditLog: { create: auditCreate },
  } as unknown as PrismaService;

  return { prisma, auditCreate, getCapturedAudit: () => capturedAudit };
}

describe('InventoryExportService sensitive workbook', () => {
  it('creates genuinely encrypted XLSX with structured relationships and credentials', async () => {
    const { prisma, auditCreate, getCapturedAudit } = createFixturePrisma();
    const credentials = {
      decrypt: jest.fn((value: string) => `plain:${value}`),
    } as unknown as CredentialsService;
    const service = new InventoryExportService(prisma, credentials);
    const passphrase = 'Workbook-Key-2026';

    const encrypted = await service.createWorkbook(passphrase, 'admin-1');

    await expect(XlsxPopulate.fromDataAsync(encrypted)).rejects.toBeDefined();
    await expect(
      XlsxPopulate.fromDataAsync(encrypted, { password: 'Not-The-Key' }),
    ).rejects.toBeDefined();

    const workbook = await XlsxPopulate.fromDataAsync(encrypted, {
      password: passphrase,
    });
    const sheetNames = workbook
      .sheets()
      .map((sheet: { name(): string }) => sheet.name());
    expect(sheetNames).toEqual(
      expect.arrayContaining([
        'Export Metadata',
        'Field Definitions',
        'Applications',
        'Environments',
        'Components',
        'Application Access',
        'Assets',
        'Asset Access Points',
        'Virtual Machines',
        'Database Instances',
        'Logical Databases',
        'Relationships',
        'vCenter Sources',
        'Credentials',
      ]),
    );

    const credentialValues = workbook
      .sheet('Credentials')
      .usedRange()
      .value() as unknown[][];
    const credentialText = JSON.stringify(credentialValues);
    expect(credentialText).toContain('asset-admin');
    expect(credentialText).toContain('plain:enc-asset');
    expect(credentialText).toContain('plain:enc-app');
    expect(credentialText).toContain('plain:enc-db');
    expect(credentialText).toContain('plain:enc-vm');
    expect(credentialText).toContain('plain:enc-vc');

    const relationshipText = JSON.stringify(
      workbook.sheet('Relationships').usedRange().value(),
    );
    expect(relationshipText).toContain('COMPONENT_ASSET');
    expect(relationshipText).toContain('PRIMARY');
    expect(relationshipText).toContain('COMPONENT_VM');
    expect(relationshipText).toContain('SHARED');
    expect(relationshipText).toContain('ACCESS_POINT_CREDENTIAL');
    expect(relationshipText).toContain('DATABASE_ACCOUNT_LOGICAL_SCOPE');

    const allWorkbookText = sheetNames
      .map((name: string) =>
        JSON.stringify(workbook.sheet(name).usedRange().value()),
      )
      .join('\n');
    expect(allWorkbookText).not.toContain('KnowledgeDocument');
    expect(allWorkbookText).not.toContain('JWT_SECRET');
    expect(allWorkbookText).not.toContain('CREDENTIAL_ENCRYPTION_KEY');
    expect(allWorkbookText).not.toContain(passphrase);

    expect(auditCreate).toHaveBeenCalledTimes(1);
    const auditArg = getCapturedAudit();
    expect(auditArg).toBeDefined();
    expect(auditArg?.data.userId).toBe('admin-1');
    expect(auditArg?.data.action).toBe(AuditAction.EXPORT_DATA);
    expect(auditArg?.data.details).not.toContain(passphrase);
    expect(auditArg?.data.details).not.toContain('plain:');
  });
});
