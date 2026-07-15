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
    const encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY;

    if (!defaultAdminPassword || !defaultEditorPassword) {
        throw new Error('DEFAULT_ADMIN_PASSWORD and DEFAULT_EDITOR_PASSWORD must be set before seeding.');
    }

    console.log('--- Database Seeding Started ---');

    console.log('Step 1: Clearing existing data...');
    // Delete in reverse dependency order
    await prisma.knowledgeDocument.deleteMany();
    await prisma.knowledgeCategory.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.credential.deleteMany();
    await prisma.patchInfo.deleteMany();
    await prisma.iPAllocation.deleteMany();
    await prisma.assetNote.deleteMany();
    await prisma.assetAttachment.deleteMany();
    await prisma.databaseAccount.deleteMany();
    await prisma.databaseInventory.deleteMany();
    await prisma.vmGuestAccount.deleteMany();
    await prisma.vmInventory.deleteMany();
    await prisma.vmDiscovery.deleteMany();
    await prisma.vmVCenterSource.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Old data cleared.');

    console.log('Step 2: Creating users...');
    const fixedPasswordHash = await bcrypt.hash('AssetOpsNewPass2026!!', 10);

    const adminUser = await prisma.user.create({
        data: {
            username: 'admin',
            displayName: 'Infra Admin',
            avatarSeed: crypto.randomBytes(8).toString('hex'),
            email: 'admin@infrapilot.local',
            passwordHash: fixedPasswordHash,
            mustChangePassword: false,
            role: Role.ADMIN,
        },
    });

    const editorUser = await prisma.user.create({
        data: {
            username: 'soc_analyst',
            displayName: 'SOC Analyst',
            avatarSeed: crypto.randomBytes(8).toString('hex'),
            email: 'soc-analyst@infrapilot.local',
            passwordHash: fixedPasswordHash,
            mustChangePassword: false,
            role: Role.EDITOR,
        }
    });

    const viewerUser = await prisma.user.upsert({
        where: { username: 'test_viewer' },
        create: {
            username: 'test_viewer',
            displayName: 'Test Viewer',
            avatarSeed: crypto.randomBytes(8).toString('hex'),
            email: 'viewer@infrapilot.local',
            passwordHash: fixedPasswordHash,
            mustChangePassword: false,
            role: Role.VIEWER,
        },
        update: {
            displayName: 'Test Viewer',
            email: 'viewer@infrapilot.local',
            passwordHash: fixedPasswordHash,
            mustChangePassword: false,
            role: Role.VIEWER,
        }
    });
    console.log(`✅ Users created (admin, soc_analyst, test_viewer).`);

    console.log('Step 3: Creating sample categories...');
    const category = await prisma.knowledgeCategory.create({
        data: { name: 'General', icon: 'Book' }
    });
    console.log(`✅ Sample clients and categories created.`);

    console.log('Step 4: Creating sample assets...');
    const assetsData = [
        {
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
        const asset = await prisma.asset.create({
            data: {
                ...assetData,
                createdByUser: { connect: { id: adminUser.id } }
            }
        });
        createdAssets.push(asset);
    }
    console.log(`✅ Sample assets created.`);

    console.log('Step 4.5: Creating sample virtual machines...');
    await prisma.vmInventory.create({
        data: {
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
        }
    });
    console.log(`✅ Sample VMs created.`);

    console.log('Step 5: Creating sample KB document...');
    await prisma.knowledgeDocument.create({
        data: {
            title: 'Getting Started',
            content: 'Welcome to the IT Asset Inventory system.',
            categoryId: category.id,
            authorId: adminUser.id
        }
    });
    console.log(`✅ Sample KB document created.`);

    if (encryptionKey && Buffer.from(encryptionKey, 'hex').length === 32) {
        console.log('Step 6: Seeding credentials...');
        await prisma.credential.create({
            data: {
                assetId: createdAssets[0].id,
                username: 'postgres_admin',
                encryptedPassword: encryptPasswordForSeed('SuperSecretDBPass123!', encryptionKey),
                type: 'OS',
                nodeLabel: 'MGMT'
            }
        });
        console.log(`✅ Credentials seeded.`);
    } else {
        console.warn('⚠️ Skipping credentials seed: CREDENTIAL_ENCRYPTION_KEY invalid or missing.');
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
