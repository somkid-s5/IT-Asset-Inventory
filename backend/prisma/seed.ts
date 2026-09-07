import {
  PrismaClient,
  Role,
  AssetType,
  AssetStatus,
  ApplicationEnvironmentName,
  DatabaseAccountScope,
  DatabaseStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function encryptPasswordForSeed(password: string, hexKey: string): string {
  const iv = crypto.randomBytes(16);
  const keyBuffer = Buffer.from(hexKey, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error('Encryption key must be exactly 32 bytes (64 hex chars).');
  }

  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

async function main() {
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  const defaultEditorPassword = process.env.DEFAULT_EDITOR_PASSWORD;
  const defaultViewerPassword = process.env.DEFAULT_VIEWER_PASSWORD;
  const encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Development seed is disabled when NODE_ENV=production.');
  }

  if (process.env.ALLOW_DEVELOPMENT_SEED !== 'true') {
    throw new Error(
      'Set ALLOW_DEVELOPMENT_SEED=true only for an isolated development database.',
    );
  }

  if (
    !defaultAdminPassword ||
    !defaultEditorPassword ||
    !defaultViewerPassword
  ) {
    throw new Error(
      'DEFAULT_ADMIN_PASSWORD, DEFAULT_EDITOR_PASSWORD, and DEFAULT_VIEWER_PASSWORD must be set before seeding.',
    );
  }

  console.log('--- Database Seeding Started ---');
  console.log(
    'Existing records will be preserved; development fixtures are upserted by stable identifiers.',
  );

  console.log('Step 1: Upserting users...');
  const [adminPasswordHash, editorPasswordHash, viewerPasswordHash] =
    await Promise.all([
      bcrypt.hash(defaultAdminPassword, 10),
      bcrypt.hash(defaultEditorPassword, 10),
      bcrypt.hash(defaultViewerPassword, 10),
    ]);

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    create: {
      username: 'admin',
      displayName: 'Infra Admin',
      avatarSeed: crypto.randomBytes(8).toString('hex'),
      email: 'admin@infrapilot.local',
      passwordHash: adminPasswordHash,
      mustChangePassword: false,
      role: Role.ADMIN,
    },
    update: {
      displayName: 'Infra Admin',
      passwordHash: adminPasswordHash,
      mustChangePassword: false,
      role: Role.ADMIN,
      deletedAt: null,
    },
  });

  await prisma.user.upsert({
    where: { username: 'soc_analyst' },
    create: {
      username: 'soc_analyst',
      displayName: 'SOC Analyst',
      avatarSeed: crypto.randomBytes(8).toString('hex'),
      email: 'soc-analyst@infrapilot.local',
      passwordHash: editorPasswordHash,
      mustChangePassword: false,
      role: Role.EDITOR,
    },
    update: {
      displayName: 'SOC Analyst',
      passwordHash: editorPasswordHash,
      mustChangePassword: false,
      role: Role.EDITOR,
      deletedAt: null,
    },
  });

  await prisma.user.upsert({
    where: { username: 'test_viewer' },
    create: {
      username: 'test_viewer',
      displayName: 'Test Viewer',
      avatarSeed: crypto.randomBytes(8).toString('hex'),
      email: 'viewer@infrapilot.local',
      passwordHash: viewerPasswordHash,
      mustChangePassword: false,
      role: Role.VIEWER,
    },
    update: {
      displayName: 'Test Viewer',
      email: 'viewer@infrapilot.local',
      passwordHash: viewerPasswordHash,
      mustChangePassword: false,
      role: Role.VIEWER,
      deletedAt: null,
    },
  });
  console.log('Development users upserted (admin, soc_analyst, test_viewer).');

  console.log('Step 2: Upserting sample category...');
  const category = await prisma.knowledgeCategory.upsert({
    where: { name: 'General' },
    create: { name: 'General', icon: 'Book' },
    update: { icon: 'Book' },
  });
  console.log('Sample category upserted.');

  console.log('Step 3: Upserting sample assets...');
  const assetsData = [
    {
      assetId: 'DEV-ASSET-001',
      sn: 'E2E-SN-001',
      name: 'db-prod-01',
      type: AssetType.SERVER,
      osVersion: 'Ubuntu 22.04 LTS',
      status: AssetStatus.ACTIVE,
      department: 'Database Admins',
      owner: 'db-team',
      location: 'Bangkok DC1',
      ipAllocations: {
        create: [
          { address: '10.0.1.45', type: 'Management', nodeLabel: 'MGMT' },
        ],
      },
    },
    {
      assetId: 'DEV-ASSET-002',
      name: 'web-front-lb',
      type: AssetType.SERVER,
      osVersion: 'NGINX Alpine',
      status: AssetStatus.ACTIVE,
      department: 'Web Infrastructure',
      owner: 'web-team',
      location: 'Bangkok DC1',
      ipAllocations: {
        create: [{ address: '10.0.2.12', type: 'VIP', nodeLabel: 'FRONTEND' }],
      },
    },
    {
      assetId: 'DEV-ASSET-003',
      name: 'switch-core-01',
      type: AssetType.SWITCH,
      osVersion: 'Cisco IOS-XE',
      status: AssetStatus.ACTIVE,
      department: 'Network Operations',
      owner: 'net-team',
      location: 'Bangkok DC1',
      ipAllocations: {
        create: [
          { address: '10.0.9.1', type: 'Management', nodeLabel: 'MGMT' },
        ],
      },
    },
    {
      assetId: 'DEV-ASSET-004',
      name: 'app-prod-01',
      type: AssetType.SERVER,
      osVersion: 'Rocky Linux 9',
      status: AssetStatus.ACTIVE,
      department: 'Application Operations',
      owner: 'app-team',
      location: 'Bangkok DC2',
      ipAllocations: {
        create: [{ address: '10.0.3.20', type: 'Host', nodeLabel: 'APP' }],
      },
    },
    {
      assetId: 'DEV-ASSET-005',
      name: 'db-uat-01',
      type: AssetType.SERVER,
      osVersion: 'Ubuntu 24.04 LTS',
      status: AssetStatus.MAINTENANCE,
      department: 'Database Admins',
      owner: 'db-team',
      location: 'Bangkok DC1',
      ipAllocations: {
        create: [
          { address: '10.0.4.45', type: 'Management', nodeLabel: 'MGMT' },
        ],
      },
    },
    {
      assetId: 'DEV-ASSET-006',
      name: 'switch-edge-01',
      type: AssetType.SWITCH,
      osVersion: 'Cisco IOS-XE',
      status: AssetStatus.ACTIVE,
      department: 'Network Operations',
      owner: 'net-team',
      location: 'Bangkok DC1',
      ipAllocations: {
        create: [
          { address: '10.0.9.2', type: 'Management', nodeLabel: 'MGMT' },
        ],
      },
    },
    {
      assetId: 'DEV-ASSET-007',
      name: 'ilo-prod-01',
      type: AssetType.SP,
      osVersion: 'iLO 6',
      status: AssetStatus.ACTIVE,
      department: 'Infrastructure Operations',
      owner: 'infra-team',
      location: 'Bangkok DC1',
      ipAllocations: {
        create: [
          { address: '10.0.10.7', type: 'Management', nodeLabel: 'MGMT' },
        ],
      },
    },
    {
      assetId: 'DEV-ASSET-008',
      name: 'core-router-01',
      type: AssetType.NETWORK,
      osVersion: 'IOS-XE 17',
      status: AssetStatus.ACTIVE,
      department: 'Network Operations',
      owner: 'net-team',
      location: 'Bangkok DC1',
      ipAllocations: {
        create: [
          { address: '10.0.9.254', type: 'Management', nodeLabel: 'MGMT' },
        ],
      },
    },
  ];

  const createdAssets = [];
  for (const assetData of assetsData) {
    const asset = await prisma.asset.upsert({
      where: { assetId: assetData.assetId },
      create: {
        ...assetData,
        createdByUser: { connect: { id: adminUser.id } },
      },
      update: {
        name: assetData.name,
        ...('sn' in assetData && assetData.sn ? { sn: assetData.sn } : {}),
        type: assetData.type,
        osVersion: assetData.osVersion,
        status: assetData.status,
        department: assetData.department,
        owner: assetData.owner,
        location: assetData.location,
      },
    });
    for (const allocation of assetData.ipAllocations.create) {
      await prisma.iPAllocation.upsert({
        where: {
          address_assetId: {
            address: allocation.address,
            assetId: asset.id,
          },
        },
        create: {
          ...allocation,
          assetId: asset.id,
        },
        update: {
          type: allocation.type,
          nodeLabel: allocation.nodeLabel,
        },
      });
    }
    createdAssets.push(asset);
  }
  console.log('Sample assets upserted.');

  console.log('Step 4: Upserting sample application topology...');
  const seededApplication = await prisma.application.upsert({
    where: { name: 'Treasury Registry' },
    create: {
      name: 'Treasury Registry',
      technicalOwner: 'Application Operations',
      businessUnit: 'Treasury',
      description:
        'Reference production application used by deterministic V1 acceptance journeys.',
      createdByUserId: adminUser.id,
    },
    update: {
      technicalOwner: 'Application Operations',
      businessUnit: 'Treasury',
      description:
        'Reference production application used by deterministic V1 acceptance journeys.',
    },
  });
  const seededProdEnvironment = await prisma.applicationEnvironment.upsert({
    where: {
      applicationId_name: {
        applicationId: seededApplication.id,
        name: ApplicationEnvironmentName.PROD,
      },
    },
    create: {
      applicationId: seededApplication.id,
      name: ApplicationEnvironmentName.PROD,
      noDatabase: false,
      sortOrder: 0,
    },
    update: { noDatabase: false, sortOrder: 0 },
  });
  const seededWebComponent = await prisma.applicationComponent.upsert({
    where: {
      environmentId_name: {
        environmentId: seededProdEnvironment.id,
        name: 'Web',
      },
    },
    create: {
      environmentId: seededProdEnvironment.id,
      name: 'Web',
      description: 'Primary web tier for the deterministic acceptance fixture.',
      sortOrder: 0,
    },
    update: {
      description: 'Primary web tier for the deterministic acceptance fixture.',
      sortOrder: 0,
    },
  });
  const seededApiComponent = await prisma.applicationComponent.upsert({
    where: {
      environmentId_name: {
        environmentId: seededProdEnvironment.id,
        name: 'API',
      },
    },
    create: {
      environmentId: seededProdEnvironment.id,
      name: 'API',
      description: 'Shared API tier for the deterministic acceptance fixture.',
      sortOrder: 1,
    },
    update: {
      description: 'Shared API tier for the deterministic acceptance fixture.',
      sortOrder: 1,
    },
  });
  const applicationAsset = createdAssets.find(
    (asset) => asset.assetId === 'DEV-ASSET-004',
  );
  if (!applicationAsset) {
    throw new Error(
      'Development application Asset fixture DEV-ASSET-004 is missing.',
    );
  }
  await prisma.applicationComponentAsset.upsert({
    where: {
      componentId_assetId: {
        componentId: seededWebComponent.id,
        assetId: applicationAsset.id,
      },
    },
    create: {
      componentId: seededWebComponent.id,
      assetId: applicationAsset.id,
      relationType: 'PRIMARY',
    },
    update: { relationType: 'PRIMARY' },
  });
  await prisma.applicationComponentAsset.upsert({
    where: {
      componentId_assetId: {
        componentId: seededApiComponent.id,
        assetId: applicationAsset.id,
      },
    },
    create: {
      componentId: seededApiComponent.id,
      assetId: applicationAsset.id,
      relationType: 'SHARED',
    },
    update: { relationType: 'SHARED' },
  });
  console.log('Sample application topology upserted.');

  console.log('Step 5: Upserting sample virtual machine...');
  const vmSource = await prisma.vmVCenterSource.upsert({
    where: { name: 'development-vcenter' },
    create: {
      name: 'development-vcenter',
      endpoint: 'https://vcenter.development.local',
      version: '8.0',
      syncInterval: 60,
      status: 'HEALTHY',
      lastSyncAt: new Date(),
      createdByUser: { connect: { id: adminUser.id } },
    },
    update: {
      version: '8.0',
      status: 'HEALTHY',
      lastSyncAt: new Date(),
      createdByUser: { connect: { id: adminUser.id } },
    },
  });
  const existingAcceptanceInventory = await prisma.vmInventory.findFirst({
    where: { sourceId: vmSource.id, moid: 'vm-e2e-needs-context' },
    select: { id: true },
  });
  if (existingAcceptanceInventory) {
    await prisma.vmGuestAccount.deleteMany({
      where: { inventoryId: existingAcceptanceInventory.id },
    });
    await prisma.vmInventory.delete({
      where: { id: existingAcceptanceInventory.id },
    });
  }
  await prisma.vmDiscovery.upsert({
    where: {
      sourceId_moid: {
        sourceId: vmSource.id,
        moid: 'vm-e2e-needs-context',
      },
    },
    create: {
      name: 'vm-e2e-needs-context',
      systemName: 'VM-E2E-NEEDS-CONTEXT',
      moid: 'vm-e2e-needs-context',
      sourceId: vmSource.id,
      cluster: 'Cluster-E2E',
      host: 'esxi-e2e.infrapilot.local',
      guestOs: 'Ubuntu Linux (64-bit)',
      primaryIp: '10.250.20.10',
      cpuCores: 2,
      memoryGb: 4,
      storageGb: 40,
      networkLabel: 'E2E Network',
      powerState: 'RUNNING',
      state: 'NEEDS_CONTEXT',
      completeness: 20,
      missingFields: [
        'Environment',
        'Service Role',
        'Service Purpose',
        'Guest Accounts',
      ],
      lastSeenAt: new Date(),
      tags: ['e2e', 'needs-context'],
      guestAccountsCount: 0,
      notes: 'Deterministic incomplete discovery fixture for V1 acceptance.',
      createdByUserId: adminUser.id,
    },
    update: {
      systemName: 'VM-E2E-NEEDS-CONTEXT',
      state: 'NEEDS_CONTEXT',
      completeness: 20,
      missingFields: [
        'Environment',
        'Service Role',
        'Service Purpose',
        'Guest Accounts',
      ],
      environment: null,
      serviceRole: null,
      description: null,
      owner: null,
      businessUnit: null,
      slaTier: null,
      lastSeenAt: new Date(),
      tags: ['e2e', 'needs-context'],
      guestAccountsCount: 0,
      notes: 'Deterministic incomplete discovery fixture for V1 acceptance.',
      guestAccounts: { deleteMany: {} },
      createdByUserId: adminUser.id,
    },
  });

  const seededVm = await prisma.vmInventory.upsert({
    where: { sourceId_moid: { sourceId: vmSource.id, moid: 'vm-12345' } },
    create: {
      name: 'vm-prod-01',
      systemName: 'VM-PROD-01.infrapilot.local',
      moid: 'vm-12345',
      sourceId: vmSource.id,
      environment: 'PROD',
      cluster: 'Cluster-01',
      host: 'esxi-01.infrapilot.local',
      guestOs: 'Ubuntu Linux (64-bit)',
      primaryIp: '10.0.1.100',
      cpuCores: 4,
      memoryGb: 16,
      storageGb: 100,
      networkLabel: 'VM Network',
      powerState: 'RUNNING',
      lifecycleState: 'ACTIVE',
      syncState: 'SYNCED',
      owner: 'infra-team',
      businessUnit: 'Infrastructure',
      slaTier: 'Tier-1',
      serviceRole: 'Web Server',
      criticality: 'BUSINESS_CRITICAL',
      description: 'Core production web application host VM',
      notes: 'Managed by terraform',
      lastSyncAt: new Date(),
      createdByUserId: adminUser.id,
    },
    update: {
      name: 'vm-prod-01',
      systemName: 'VM-PROD-01.infrapilot.local',
      owner: 'infra-team',
      lifecycleState: 'ACTIVE',
      sourceId: vmSource.id,
      lastSyncAt: new Date(),
    },
  });
  await prisma.applicationComponentVm.upsert({
    where: {
      componentId_vmId: {
        componentId: seededWebComponent.id,
        vmId: seededVm.id,
      },
    },
    create: {
      componentId: seededWebComponent.id,
      vmId: seededVm.id,
      relationType: 'PRIMARY',
    },
    update: { relationType: 'PRIMARY' },
  });
  await prisma.applicationComponentVm.upsert({
    where: {
      componentId_vmId: {
        componentId: seededApiComponent.id,
        vmId: seededVm.id,
      },
    },
    create: {
      componentId: seededApiComponent.id,
      vmId: seededVm.id,
      relationType: 'SHARED',
    },
    update: { relationType: 'SHARED' },
  });
  console.log('Sample VM and Application relationships upserted.');

  const failedAttentionSource = await prisma.vmVCenterSource.upsert({
    where: { name: 'dq-e2e-failed-vcenter' },
    create: {
      name: 'dq-e2e-failed-vcenter',
      endpoint: 'https://failed-vcenter.e2e.invalid',
      version: '8.0',
      syncInterval: 60,
      status: 'CONNECTION_FAILED',
      lastSyncAt: new Date(),
      notes:
        'Deterministic operational-attention fixture for Dashboard acceptance.',
      createdByUser: { connect: { id: adminUser.id } },
    },
    update: {
      version: '8.0',
      status: 'CONNECTION_FAILED',
      lastSyncAt: new Date(),
      notes:
        'Deterministic operational-attention fixture for Dashboard acceptance.',
      createdByUser: { connect: { id: adminUser.id } },
    },
  });
  void failedAttentionSource;

  const deletedAttentionVm = await prisma.vmInventory.upsert({
    where: {
      sourceId_moid: {
        sourceId: vmSource.id,
        moid: 'vm-e2e-deleted-in-vcenter',
      },
    },
    create: {
      name: 'vm-e2e-deleted-in-vcenter',
      systemName: 'VM-E2E-DELETED',
      moid: 'vm-e2e-deleted-in-vcenter',
      sourceId: vmSource.id,
      environment: 'PROD',
      cluster: 'Cluster-E2E',
      host: 'esxi-e2e.infrapilot.local',
      guestOs: 'Ubuntu Linux (64-bit)',
      primaryIp: '10.250.20.11',
      cpuCores: 2,
      memoryGb: 4,
      storageGb: 40,
      networkLabel: 'E2E Network',
      powerState: 'STOPPED',
      lifecycleState: 'DELETED_IN_VCENTER',
      discoveryState: 'READY_TO_PROMOTE',
      syncState: 'Missing from source',
      owner: 'infra-team',
      businessUnit: 'Infrastructure',
      slaTier: 'Tier-2',
      serviceRole: 'Retired application host',
      criticality: 'STANDARD',
      description: 'Deterministic deleted-in-vCenter operational fixture.',
      tags: ['e2e', 'operational-attention'],
      lastSyncAt: new Date(),
      syncedFields: [],
      managedFields: [],
      notes: 'Kept in Inventory after source deletion for acceptance evidence.',
      createdByUserId: adminUser.id,
    },
    update: {
      name: 'vm-e2e-deleted-in-vcenter',
      systemName: 'VM-E2E-DELETED',
      lifecycleState: 'DELETED_IN_VCENTER',
      discoveryState: 'READY_TO_PROMOTE',
      syncState: 'Missing from source',
      owner: 'infra-team',
      businessUnit: 'Infrastructure',
      slaTier: 'Tier-2',
      serviceRole: 'Retired application host',
      criticality: 'STANDARD',
      description: 'Deterministic deleted-in-vCenter operational fixture.',
      tags: ['e2e', 'operational-attention'],
      lastSyncAt: new Date(),
      notes: 'Kept in Inventory after source deletion for acceptance evidence.',
      createdByUserId: adminUser.id,
    },
  });
  await prisma.applicationComponentVm.upsert({
    where: {
      componentId_vmId: {
        componentId: seededWebComponent.id,
        vmId: deletedAttentionVm.id,
      },
    },
    create: {
      componentId: seededWebComponent.id,
      vmId: deletedAttentionVm.id,
      relationType: 'SHARED',
    },
    update: { relationType: 'SHARED' },
  });

  console.log('Step 6: Upserting sample database topology...');
  const existingSeededDatabase = await prisma.databaseInventory.findFirst({
    where: { name: 'Treasury Registry DB' },
  });
  const seededDatabase = existingSeededDatabase
    ? await prisma.databaseInventory.update({
        where: { id: existingSeededDatabase.id },
        data: {
          engine: 'Oracle',
          version: '19c',
          environment: 'PROD',
          host: null,
          hostVmId: seededVm.id,
          hostAssetId: null,
          ipAddress: '10.250.20.20',
          port: '1521',
          serviceName: 'TRREG',
          owner: 'Database Operations',
          backupPolicy: 'Daily incremental / weekly full',
          replication: 'Primary instance',
          maintenanceWindow: 'Sun 02:00-04:00',
          status: DatabaseStatus.ACTIVE,
          note: 'Deterministic Database fixture for V1 acceptance.',
        },
      })
    : await prisma.databaseInventory.create({
        data: {
          name: 'Treasury Registry DB',
          engine: 'Oracle',
          version: '19c',
          environment: 'PROD',
          hostVmId: seededVm.id,
          ipAddress: '10.250.20.20',
          port: '1521',
          serviceName: 'TRREG',
          owner: 'Database Operations',
          backupPolicy: 'Daily incremental / weekly full',
          replication: 'Primary instance',
          maintenanceWindow: 'Sun 02:00-04:00',
          status: DatabaseStatus.ACTIVE,
          note: 'Deterministic Database fixture for V1 acceptance.',
          createdByUserId: adminUser.id,
        },
      });
  const seededRegistryLogical = await prisma.logicalDatabase.upsert({
    where: {
      databaseInventoryId_name: {
        databaseInventoryId: seededDatabase.id,
        name: 'registry',
      },
    },
    create: {
      databaseInventoryId: seededDatabase.id,
      name: 'registry',
      description:
        'Primary registry schema used by the Web and API components.',
      status: DatabaseStatus.ACTIVE,
      components: {
        connect: [{ id: seededWebComponent.id }, { id: seededApiComponent.id }],
      },
    },
    update: {
      description:
        'Primary registry schema used by the Web and API components.',
      status: DatabaseStatus.ACTIVE,
      components: {
        set: [{ id: seededWebComponent.id }, { id: seededApiComponent.id }],
      },
    },
  });
  const seededAuditLogical = await prisma.logicalDatabase.upsert({
    where: {
      databaseInventoryId_name: {
        databaseInventoryId: seededDatabase.id,
        name: 'audit',
      },
    },
    create: {
      databaseInventoryId: seededDatabase.id,
      name: 'audit',
      description: 'Audit schema used by the API component.',
      status: DatabaseStatus.ACTIVE,
      components: { connect: [{ id: seededApiComponent.id }] },
    },
    update: {
      description: 'Audit schema used by the API component.',
      status: DatabaseStatus.ACTIVE,
      components: { set: [{ id: seededApiComponent.id }] },
    },
  });

  const existingNeedsContextDatabase = await prisma.databaseInventory.findFirst(
    {
      where: { name: 'db-e2e-needs-context' },
    },
  );
  if (existingNeedsContextDatabase) {
    await prisma.databaseInventory.update({
      where: { id: existingNeedsContextDatabase.id },
      data: {
        engine: 'PostgreSQL',
        version: '16',
        environment: null,
        host: null,
        hostVmId: seededVm.id,
        hostAssetId: null,
        ipAddress: null,
        port: null,
        serviceName: null,
        owner: null,
        backupPolicy: null,
        replication: null,
        maintenanceWindow: null,
        status: DatabaseStatus.ACTIVE,
        note: 'Deterministic incomplete Database fixture for Needs Context.',
      },
    });
  } else {
    await prisma.databaseInventory.create({
      data: {
        name: 'db-e2e-needs-context',
        engine: 'PostgreSQL',
        version: '16',
        hostVmId: seededVm.id,
        status: DatabaseStatus.ACTIVE,
        note: 'Deterministic incomplete Database fixture for Needs Context.',
        createdByUserId: adminUser.id,
      },
    });
  }
  console.log('Sample database topology upserted.');

  console.log('Step 7: Upserting sample KB document...');
  const existingDocument = await prisma.knowledgeDocument.findFirst({
    where: { title: 'Getting Started', categoryId: category.id },
  });
  const seededDocument = existingDocument
    ? await prisma.knowledgeDocument.update({
        where: { id: existingDocument.id },
        data: {
          content:
            '# Getting Started\n\nCanonical runbook for the deterministic infrastructure inventory acceptance journey.',
          authorId: adminUser.id,
        },
      })
    : await prisma.knowledgeDocument.create({
        data: {
          title: 'Getting Started',
          content:
            '# Getting Started\n\nCanonical runbook for the deterministic infrastructure inventory acceptance journey.',
          categoryId: category.id,
          authorId: adminUser.id,
        },
      });

  await Promise.all([
    prisma.knowledgeDocumentApplication.upsert({
      where: {
        documentId_applicationId: {
          documentId: seededDocument.id,
          applicationId: seededApplication.id,
        },
      },
      create: {
        documentId: seededDocument.id,
        applicationId: seededApplication.id,
      },
      update: {},
    }),
    prisma.knowledgeDocumentAsset.upsert({
      where: {
        documentId_assetId: {
          documentId: seededDocument.id,
          assetId: applicationAsset.id,
        },
      },
      create: {
        documentId: seededDocument.id,
        assetId: applicationAsset.id,
      },
      update: {},
    }),
    prisma.knowledgeDocumentVm.upsert({
      where: {
        documentId_vmId: {
          documentId: seededDocument.id,
          vmId: seededVm.id,
        },
      },
      create: { documentId: seededDocument.id, vmId: seededVm.id },
      update: {},
    }),
    prisma.knowledgeDocumentDatabase.upsert({
      where: {
        documentId_databaseId: {
          documentId: seededDocument.id,
          databaseId: seededDatabase.id,
        },
      },
      create: {
        documentId: seededDocument.id,
        databaseId: seededDatabase.id,
      },
      update: {},
    }),
  ]);
  console.log('Sample KB document and canonical inventory links upserted.');

  if (encryptionKey && Buffer.from(encryptionKey, 'hex').length === 32) {
    console.log('Step 8: Seeding credentials...');
    const encryptedPassword = encryptPasswordForSeed(
      defaultAdminPassword,
      encryptionKey,
    );
    await prisma.databaseAccount.upsert({
      where: {
        databaseInventoryId_username: {
          databaseInventoryId: seededDatabase.id,
          username: 'svc_registry',
        },
      },
      create: {
        databaseInventoryId: seededDatabase.id,
        username: 'svc_registry',
        role: 'Application',
        encryptedPassword,
        privileges: ['SELECT', 'INSERT', 'UPDATE'],
        note: 'Instance-wide deterministic Database credential fixture.',
        scope: DatabaseAccountScope.INSTANCE,
      },
      update: {
        role: 'Application',
        encryptedPassword,
        privileges: ['SELECT', 'INSERT', 'UPDATE'],
        note: 'Instance-wide deterministic Database credential fixture.',
        scope: DatabaseAccountScope.INSTANCE,
        logicalDatabases: { set: [] },
      },
    });
    await prisma.databaseAccount.upsert({
      where: {
        databaseInventoryId_username: {
          databaseInventoryId: seededDatabase.id,
          username: 'report_reader',
        },
      },
      create: {
        databaseInventoryId: seededDatabase.id,
        username: 'report_reader',
        role: 'Reporting',
        encryptedPassword,
        privileges: ['SELECT'],
        note: 'Logical-database-scoped deterministic Database credential fixture.',
        scope: DatabaseAccountScope.LOGICAL_DATABASES,
        logicalDatabases: {
          connect: [
            { id: seededRegistryLogical.id },
            { id: seededAuditLogical.id },
          ],
        },
      },
      update: {
        role: 'Reporting',
        encryptedPassword,
        privileges: ['SELECT'],
        note: 'Logical-database-scoped deterministic Database credential fixture.',
        scope: DatabaseAccountScope.LOGICAL_DATABASES,
        logicalDatabases: {
          set: [
            { id: seededRegistryLogical.id },
            { id: seededAuditLogical.id },
          ],
        },
      },
    });
    const existingVmGuestAccount = await prisma.vmGuestAccount.findFirst({
      where: { inventoryId: seededVm.id, username: 'svc_vm_e2e' },
    });
    if (existingVmGuestAccount) {
      await prisma.vmGuestAccount.update({
        where: { id: existingVmGuestAccount.id },
        data: {
          encryptedPassword,
          accessMethod: 'SSH',
          role: 'service',
          note: 'Deterministic VM credential fixture for V1 acceptance.',
        },
      });
    } else {
      await prisma.vmGuestAccount.create({
        data: {
          inventoryId: seededVm.id,
          username: 'svc_vm_e2e',
          encryptedPassword,
          accessMethod: 'SSH',
          role: 'service',
          note: 'Deterministic VM credential fixture for V1 acceptance.',
        },
      });
    }
    const existingCredential = await prisma.credential.findFirst({
      where: {
        assetId: createdAssets[0].id,
        username: 'postgres_admin',
        type: 'OS',
        nodeLabel: 'MGMT',
      },
    });
    const developmentCredential = existingCredential
      ? await prisma.credential.update({
          where: { id: existingCredential.id },
          data: { encryptedPassword },
        })
      : await prisma.credential.create({
          data: {
            assetId: createdAssets[0].id,
            username: 'postgres_admin',
            encryptedPassword,
            type: 'OS',
            nodeLabel: 'MGMT',
          },
        });
    const managementAllocation = await prisma.iPAllocation.findUnique({
      where: {
        address_assetId: {
          address: '10.0.1.45',
          assetId: createdAssets[0].id,
        },
      },
    });
    if (!managementAllocation) {
      throw new Error('Development management access point fixture is missing.');
    }
    await prisma.iPAllocationCredential.upsert({
      where: {
        ipAllocationId_credentialId: {
          ipAllocationId: managementAllocation.id,
          credentialId: developmentCredential.id,
        },
      },
      create: {
        ipAllocationId: managementAllocation.id,
        credentialId: developmentCredential.id,
      },
      update: {},
    });
    console.log('Development credential and access-point link upserted.');
  } else {
    throw new Error(
      'CREDENTIAL_ENCRYPTION_KEY must be a valid 64-character hex value.',
    );
  }

  console.log('--- Seeding Completed Successfully! ---');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
