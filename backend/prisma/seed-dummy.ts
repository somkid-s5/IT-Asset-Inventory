import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function encryptPassword(text: string): string {
    const algorithm = 'aes-256-gcm';
    const secretKey = process.env.ENCRYPTION_KEY || '12345678123456781234567812345678';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

async function main() {
    console.log('ðŸŒ± Starting hardware-focused database seeding...');

    // 1. Create Default Admin User
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: { passwordHash: adminPassword },
        create: {
            username: 'admin',
            displayName: 'Infra Admin',
            avatarSeed: crypto.randomBytes(8).toString('hex'),
            email: 'admin@infrapilot.local',
            passwordHash: adminPassword,
            role: 'ADMIN',
        },
    });
    console.log(`ðŸ‘¤ Created Admin user: ${admin.username}`);

    // 2. Physical Servers
    const server1 = await prisma.asset.create({
        data: {
            name: 'API-3PARSP',
            type: 'SP',
            status: 'ACTIVE',
            osVersion: 'iLO 5 Version 2.12',
            owner: 'IT Infrastructure Team',
            location: 'DC',
            rack: '1C-04',
            brandModel: 'HPE ProLiant DL360 G10',
            sn: 'CN70170QQC',
            ipAllocations: {
                create: [
                    { address: '192.168.11.64', type: 'iLO' }
                ]
            },
            createdByUserId: admin.id,
        }
    });

    const storage1 = await prisma.asset.create({
        data: {
            name: 'API-3PAR8200',
            type: 'STORAGE',
            status: 'ACTIVE',
            osVersion: '3.3.1.410',
            owner: 'IT Infrastructure Team',
            location: 'DC',
            rack: '1C-04',
            brandModel: 'HPE / 3PAR StoreServ 8200',
            sn: '7CE022P0TB',
            ipAllocations: {
                create: [
                    { address: '192.168.11.63', type: 'Management' }
                ]
            },
            createdByUserId: admin.id,
        }
    });

    const switch1 = await prisma.asset.create({
        data: {
            name: 'API-SANSW01',
            type: 'SWITCH',
            status: 'ACTIVE',
            osVersion: 'Fabric OS: v8.2.1c',
            location: 'DC',
            rack: '1C-04',
            brandModel: 'HPE StoreFabric SN3600B',
            sn: 'CZC014WXEG',
            ipAllocations: {
                create: [{ address: '192.168.13.249', type: 'IPMI' }]
            },
            createdByUserId: admin.id,
        }
    });

    // 3. Create Credentials
    console.log('ðŸ”‘ Seeding encrypted credentials...');

    await prisma.credential.createMany({
        data: [
            { assetId: server1.id, username: 'administrator', type: 'iLO', encryptedPassword: encryptPassword('ZYHMSWL2'), lastChangedDate: new Date() },
            { assetId: storage1.id, username: '3paradm', type: 'SSH', encryptedPassword: encryptPassword('3pardata'), lastChangedDate: new Date() },
            { assetId: switch1.id, username: 'admin', type: 'WEB/SSH', encryptedPassword: encryptPassword('P@ssw0rd'), lastChangedDate: new Date() },
        ]
    });

    console.log('âœ… Seed complete. Hardware-only focus applied.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
