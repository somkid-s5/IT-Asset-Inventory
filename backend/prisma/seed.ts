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
    const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'AssetOpsAdmin2026!';
    const defaultEditorPassword = process.env.DEFAULT_EDITOR_PASSWORD || 'AssetOpsEditor2026!';
    const encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY;

    console.log('--- Database Seeding Started ---');
    
    console.log('Step 1: Clearing existing data...');
    // Delete in reverse dependency order
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
    const adminPasswordHash = await bcrypt.hash(defaultAdminPassword, 10);
    const adminUser = await prisma.user.create({
        data: {
            username: 'admin',
            displayName: 'Infra Admin',
            avatarSeed: crypto.randomBytes(8).toString('hex'),
            email: 'admin@infrapilot.local',
            passwordHash: adminPasswordHash,
            role: Role.ADMIN,
        },
    });

    const editorPasswordHash = await bcrypt.hash(defaultEditorPassword, 10);
    const editorUser = await prisma.user.create({
        data: {
            username: 'soc_analyst',
            displayName: 'SOC Analyst',
            avatarSeed: crypto.randomBytes(8).toString('hex'),
            email: 'soc-analyst@infrapilot.local',
            passwordHash: editorPasswordHash,
            role: Role.EDITOR,
        }
    });
    console.log(`✅ Users created (admin, soc_analyst).`);

    console.log('Step 3: Creating sample assets...');
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

    if (encryptionKey && Buffer.from(encryptionKey, 'hex').length === 32) {
        console.log('Step 4: Seeding credentials...');
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
