import { PrismaClient, Role, AssetType, AssetStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
    const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'AssetOpsAdmin2026!';

    console.log('Clearing ALL old data...');
    // Delete in order to avoid FK issues
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

    console.log('Old data cleared. Starting seed...');

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
    console.log(`Created admin user: ${adminUser.username} with password: ${defaultAdminPassword}`);

    // Create some initial assets for testing
    await prisma.asset.create({
        data: {
            name: 'QA-Test-Server',
            type: AssetType.SERVER,
            status: AssetStatus.ACTIVE,
            environment: 'TEST',
            createdByUserId: adminUser.id,
            ipAllocations: {
                create: [{ address: '192.168.100.10', type: 'Management' }]
            }
        }
    });

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
