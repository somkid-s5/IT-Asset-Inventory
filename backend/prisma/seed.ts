import { PrismaClient, Role, AssetType, AssetStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// This MUST match the way the backend encrypts passwords
// From CredentialsService:
// private encryptPassword(password: string): string {
//   const iv = crypto.randomBytes(16);
//   const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(this.encryptionKey, 'hex'), iv);
//   let encrypted = cipher.update(password, 'utf8', 'hex');
//   encrypted += cipher.final('hex');
//   const authTag = cipher.getAuthTag().toString('hex');
//   // Format: iv:encrypted:authTag
//   return `${iv.toString('hex')}:${encrypted}:${authTag}`;
// }

function encryptPasswordForSeed(password: string, hexKey: string): string {
    const iv = crypto.randomBytes(16);
    // Ensure the key is exactly 32 bytes (64 hex characters)
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
    console.log('Clearing old data...');
    // Delete in reverse dependency order
    await prisma.auditLog.deleteMany();
    await prisma.credential.deleteMany();
    await prisma.patchInfo.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.user.deleteMany();

    console.log('Old data cleared. Starting seed...');

    // 1. Create a mock admin user
    const adminPasswordHash = await bcrypt.hash('P@ssw0rd', 10);
    const adminValue = await prisma.user.create({
        data: {
            email: 'admin@test.test',
            passwordHash: adminPasswordHash,
            role: Role.ADMIN,
        },
    });
    console.log(`Created admin user: ${adminValue.email}`);

    // Create an Editor user
    const editorPasswordHash = await bcrypt.hash('editor123', 10);
    const editorValue = await prisma.user.create({
        data: {
            email: 'soc-analyst@infrapilot.local',
            passwordHash: editorPasswordHash,
            role: Role.EDITOR,
        }
    });


    // 2. Create mock assets
    const assetsData = [
        {
            name: 'db-prod-01',
            type: AssetType.DB,
            ipAddress: '10.0.1.45',
            macAddress: '00:1B:44:11:3A:B7',
            osVersion: 'Ubuntu 22.04 LTS',
            status: AssetStatus.ACTIVE,
            department: 'Database Admins',
            owner: 'db-team',
            patchInfo: {
                create: {
                    currentVersion: 'PG-14.2',
                    latestVersion: 'PG-14.8',
                    eolDate: new Date('2025-12-31'),
                    lastPatchedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 190), // over 6 months ago
                }
            }
        },
        {
            name: 'web-front-lb',
            type: AssetType.SERVER,
            ipAddress: '10.0.2.12',
            osVersion: 'NGINX Alpine',
            status: AssetStatus.ACTIVE,
            department: 'Web Infrastructure',
            owner: 'web-team',
            patchInfo: {
                create: {
                    currentVersion: '1.24.0',
                    latestVersion: '1.24.0',
                    eolDate: new Date('2026-06-30'),
                    lastPatchedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10), // recent
                }
            }
        },
        {
            name: 'auth-service-vm',
            type: AssetType.VM,
            ipAddress: '10.0.5.99',
            osVersion: 'Windows Server 2019',
            status: AssetStatus.ACTIVE,
            department: 'Security',
            patchInfo: {
                create: {
                    currentVersion: 'Win-2019-B2',
                    latestVersion: 'Win-2019-B5',
                    eolDate: new Date('2029-01-09'),
                    lastPatchedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90), // 3 months
                }
            }
        },
        {
            name: 'internal-wiki',
            type: AssetType.APP,
            ipAddress: '10.0.8.20',
            osVersion: 'Confluence 8.0',
            status: AssetStatus.ACTIVE,
            department: 'IT Support',
        },
        {
            name: 'legacy-app-server',
            type: AssetType.SERVER,
            ipAddress: '10.0.1.100',
            osVersion: 'Windows Server 2008 R2',
            status: AssetStatus.DECOMMISSIONED,
            department: 'Legacy Systems',
        }
    ];

    console.log('Seeding assets...');
    const createdAssets = [];
    for (const assetData of assetsData) {
        const asset = await prisma.asset.create({
            data: {
                ...assetData,
                createdByUser: {
                    connect: { id: adminValue.id }
                }
            }
        });
        createdAssets.push(asset);
    }
    console.log(`Created ${createdAssets.length} assets.`);

    // 3. Create mock credentials
    // Ensure we use the exact same key that the NestJS app will use
    // The .env defines CREDENTIAL_ENCRYPTION_KEY
    const encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY;

    if (!encryptionKey) {
        console.warn("WARNING: CREDENTIAL_ENCRYPTION_KEY is not defined in the environment. Credentials will not be seeded.");
        return;
    }

    // Double check length
    if (Buffer.from(encryptionKey, 'hex').length !== 32) {
        console.warn("WARNING: CREDENTIAL_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Skipping credentials.");
        return;
    }

    console.log('Seeding credentials...');

    // db-prod-01 credentials
    await prisma.credential.create({
        data: {
            assetId: createdAssets[0].id,
            username: 'postgres_admin',
            encryptedPassword: encryptPasswordForSeed('SuperSecretDBPass123!', encryptionKey),
            lastChangedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120)
        }
    });

    // web-front-lb credentials
    await prisma.credential.create({
        data: {
            assetId: createdAssets[1].id,
            username: 'root',
            encryptedPassword: encryptPasswordForSeed('Nginx#Root!2024', encryptionKey),
            lastChangedDate: new Date()
        }
    });

    // auth-service-vm
    await prisma.credential.create({
        data: {
            assetId: createdAssets[2].id,
            username: 'Administrator',
            encryptedPassword: encryptPasswordForSeed('P@ssw0rdWin2019', encryptionKey),
            lastChangedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 300) // old password
        }
    });

    console.log('Credentials seeded successfully.');
    console.log('Seed process finished!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
