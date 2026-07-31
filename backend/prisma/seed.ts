import { PrismaClient, Role, AssetType, AssetStatus } from '@prisma/client';
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
        throw new Error('Set ALLOW_DEVELOPMENT_SEED=true only for an isolated development database.');
    }

    if (!defaultAdminPassword || !defaultEditorPassword || !defaultViewerPassword) {
        throw new Error('DEFAULT_ADMIN_PASSWORD, DEFAULT_EDITOR_PASSWORD, and DEFAULT_VIEWER_PASSWORD must be set before seeding.');
    }

    console.log('--- Database Seeding Started ---');
    console.log('Existing records will be preserved; development fixtures are upserted by stable identifiers.');

    console.log('Step 1: Upserting users...');
    const [adminPasswordHash, editorPasswordHash, viewerPasswordHash] = await Promise.all([
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
        }
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
            name: 'db-prod-01',
            type: AssetType.SERVER,
            osVersion: 'Ubuntu 22.04 LTS',
            status: AssetStatus.ACTIVE,
            department: 'Database Admins',
            owner: 'db-team',
            ipAllocations: {
                create: [
                    { address: '10.0.1.45', type: 'Management', nodeLabel: 'MGMT' }
                ]
            }
        },
        {
            assetId: 'DEV-ASSET-002',
            name: 'web-front-lb',
            type: AssetType.SERVER,
            osVersion: 'NGINX Alpine',
            status: AssetStatus.ACTIVE,
            department: 'Web Infrastructure',
            owner: 'web-team',
            ipAllocations: {
                create: [
                    { address: '10.0.2.12', type: 'VIP', nodeLabel: 'FRONTEND' }
                ]
            }
        },
        {
            assetId: 'DEV-ASSET-003',
            name: 'switch-core-01',
            type: AssetType.SWITCH,
            osVersion: 'Cisco IOS-XE',
            status: AssetStatus.ACTIVE,
            department: 'Network Operations',
            owner: 'net-team',
            ipAllocations: {
                create: [
                    { address: '10.0.9.1', type: 'Management', nodeLabel: 'MGMT' }
                ]
            }
        }
    ];

    const createdAssets = [];
    for (const assetData of assetsData) {
        const asset = await prisma.asset.upsert({
            where: { assetId: assetData.assetId },
            create: {
                ...assetData,
                createdByUser: { connect: { id: adminUser.id } }
            },
            update: {
                name: assetData.name,
                type: assetData.type,
                osVersion: assetData.osVersion,
                status: assetData.status,
                department: assetData.department,
                owner: assetData.owner,
            },
        });
        createdAssets.push(asset);
    }
    console.log('Sample assets upserted.');

    console.log('Step 4: Upserting sample virtual machine...');
    await prisma.vmInventory.upsert({
        where: { moid: 'vm-12345' },
        create: {
            name: 'vm-prod-01',
            systemName: 'VM-PROD-01.infrapilot.local',
            moid: 'vm-12345',
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
            createdByUser: { connect: { id: adminUser.id } }
        },
        update: {
            name: 'vm-prod-01',
            systemName: 'VM-PROD-01.infrapilot.local',
            owner: 'infra-team',
            lifecycleState: 'ACTIVE',
            lastSyncAt: new Date(),
        },
    });
    console.log('Sample VM upserted.');

    console.log('Step 5: Upserting sample KB document...');
    const existingDocument = await prisma.knowledgeDocument.findFirst({
        where: { title: 'Getting Started', categoryId: category.id },
    });
    if (existingDocument) {
        await prisma.knowledgeDocument.update({
            where: { id: existingDocument.id },
            data: {
                content: 'Welcome to the IT Asset Inventory system.',
                authorId: adminUser.id,
            },
        });
    } else {
        await prisma.knowledgeDocument.create({
          data: {
            title: 'Getting Started',
            content: 'Welcome to the IT Asset Inventory system.',
            categoryId: category.id,
            authorId: adminUser.id
          },
        });
    }
    console.log('Sample KB document upserted.');

    if (encryptionKey && Buffer.from(encryptionKey, 'hex').length === 32) {
        console.log('Step 6: Seeding credentials...');
        const encryptedPassword = encryptPasswordForSeed(defaultAdminPassword, encryptionKey);
        const existingCredential = await prisma.credential.findFirst({
            where: {
                assetId: createdAssets[0].id,
                username: 'postgres_admin',
                type: 'OS',
                nodeLabel: 'MGMT',
            },
        });
        if (existingCredential) {
            await prisma.credential.update({
                where: { id: existingCredential.id },
                data: { encryptedPassword },
            });
        } else {
            await prisma.credential.create({
                data: {
                    assetId: createdAssets[0].id,
                    username: 'postgres_admin',
                    encryptedPassword,
                    type: 'OS',
                    nodeLabel: 'MGMT',
                },
            });
        }
        console.log('Development credential upserted.');
    } else {
        throw new Error('CREDENTIAL_ENCRYPTION_KEY must be a valid 64-character hex value.');
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
