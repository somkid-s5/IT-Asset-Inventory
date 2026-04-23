import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function encryptPassword(text: string): string {
    const algorithm = 'aes-256-gcm';
    const secretKey =
        process.env.CREDENTIAL_ENCRYPTION_KEY ||
        process.env.ENCRYPTION_KEY ||
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const iv = crypto.randomBytes(16);
    const keyBuffer = /^[0-9a-fA-F]{64}$/.test(secretKey)
        ? Buffer.from(secretKey, 'hex')
        : Buffer.from(secretKey);
    const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

async function main() {
    console.log('🚀 Starting large-scale database seeding...');

    // 1. Get or Create Admin User
    let admin = await prisma.user.findUnique({ where: { username: 'admin' } });
    if (!admin) {
        const adminPassword = await bcrypt.hash('Admin#2026', 10);
        admin = await prisma.user.create({
            data: {
                username: 'admin',
                displayName: 'System Admin',
                avatarSeed: 'admin-seed',
                email: 'admin@assetops.local',
                passwordHash: adminPassword,
                role: 'ADMIN',
            },
        });
    }

    const adminId = admin.id;

    // 2. Physical Assets (Servers, Storages, Switches)
    console.log('📦 Creating Physical Assets...');
    const assetTypes = ['SERVER', 'STORAGE', 'SWITCH', 'NETWORK', 'SP'] as const;
    const environments = ['PROD', 'TEST', 'UAT'];
    const locations = ['DC-BANGKOK', 'DR-CHONBURI', 'HQ-OFFICE'];
    
    for (let i = 1; i <= 20; i++) {
        const type = assetTypes[Math.floor(Math.random() * assetTypes.length)];
        const env = environments[Math.floor(Math.random() * environments.length)];
        const loc = locations[Math.floor(Math.random() * locations.length)];
        
        await prisma.asset.create({
            data: {
                name: `${type}-${env}-${i.toString().padStart(3, '0')}`,
                type: type,
                environment: env,
                status: 'ACTIVE',
                owner: 'Infrastructure Team',
                location: loc,
                rack: `${Math.floor(Math.random() * 10) + 1}${String.fromCharCode(65 + Math.floor(Math.random() * 6))}-${Math.floor(Math.random() * 42) + 1}`,
                brandModel: type === 'SERVER' ? 'Dell PowerEdge R740' : type === 'STORAGE' ? 'HPE MSA 2060' : 'Cisco Catalyst 9300',
                sn: crypto.randomBytes(6).toString('hex').toUpperCase(),
                ipAllocations: {
                    create: [
                        { address: `10.10.${Math.floor(Math.random() * 254) + 1}.${i}`, type: 'Management' },
                        { address: `192.168.${Math.floor(Math.random() * 254) + 1}.${i}`, type: 'IPMI/iLO' }
                    ]
                },
                credentials: {
                    create: [
                        { username: 'admin', type: 'SSH', encryptedPassword: encryptPassword('P@ssw0rd123'), lastChangedDate: new Date() },
                        { username: 'root', type: 'Console', encryptedPassword: encryptPassword('Root!Admin'), lastChangedDate: new Date() }
                    ]
                },
                createdByUserId: adminId,
            }
        });
    }

    // 3. VM Discovery & Inventory
    console.log('🖥️ Creating VMs...');
    
    const vcenter = await prisma.vmVCenterSource.upsert({
        where: { name: 'vcenter.local' },
        update: {},
        create: {
            name: 'vcenter.local',
            endpoint: 'https://vcenter.local/sdk',
            version: '8.0.3',
            username: 'administrator@vsphere.local',
            encryptedPassword: encryptPassword('vCenterPwd!'),
            syncInterval: '1h',
            status: 'CONNECTED',
            lastSyncAt: new Date(),
            createdByUserId: adminId
        }
    });

    for (let i = 1; i <= 50; i++) {
        const name = `VM-APP-${i.toString().padStart(3, '0')}`;
        const env = environments[Math.floor(Math.random() * environments.length)] as any;
        
        // Some as discovery (DRAFT), some as inventory (ACTIVE)
        const isInventory = i <= 35;
        
        if (isInventory) {
            await prisma.vmInventory.create({
                data: {
                    name: name,
                    systemName: `${name}.internal.local`,
                    environment: env,
                    serviceRole: i % 5 === 0 ? 'Database Server' : 'Application Server',
                    primaryIp: `172.16.${Math.floor(Math.random() * 50) + 1}.${i}`,
                    host: `ESXi-HOST-${Math.floor(Math.random() * 10) + 1}`,
                    cluster: 'CL-PRODUCTION-01',
                    moid: `vm-${1000 + i}`,
                    powerState: 'RUNNING',
                    guestOs: 'Ubuntu Linux (64-bit)',
                    cpuCores: [2, 4, 8, 16][Math.floor(Math.random() * 4)],
                    memoryGb: [4, 8, 16, 32, 64][Math.floor(Math.random() * 5)],
                    storageGb: [40, 100, 500, 1000][Math.floor(Math.random() * 4)],
                    lifecycleState: 'ACTIVE',
                    syncState: 'Synced',
                    sourceId: vcenter.id,
                    lastSyncAt: new Date(),
                    owner: 'Infra Team',
                    businessUnit: 'IT',
                    slaTier: 'Gold',
                    criticality: 'STANDARD',
                    description: 'Provisioned via automation',
                    notes: 'No issues',
                    guestAccounts: {
                        create: [
                            { username: 'sysadmin', encryptedPassword: encryptPassword('Encrypted_Pwd'), role: 'Sudoer', accessMethod: 'SSH' }
                        ]
                    },
                    disks: [
                        { label: 'Hard disk 1', sizeGb: 40, datastore: 'DS-PURE-PROD-01' },
                        { label: 'Hard disk 2', sizeGb: 100, datastore: 'DS-PURE-PROD-02' }
                    ],
                    networkLabel: 'VM Network 10',
                    createdByUserId: adminId
                }
            });
        } else {
            await prisma.vmDiscovery.create({
                data: {
                    name: `DRAFT-${name}`,
                    moid: `vm-${2000 + i}`,
                    sourceId: vcenter.id,
                    powerState: 'RUNNING',
                    guestOs: 'Windows Server 2022',
                    primaryIp: `172.16.${Math.floor(Math.random() * 50) + 1}.${i}`,
                    host: `ESXi-HOST-${Math.floor(Math.random() * 10) + 1}`,
                    cluster: 'CL-STAGING-01',
                    cpuCores: 4,
                    memoryGb: 8,
                    storageGb: 80,
                    state: 'NEEDS_CONTEXT',
                    completeness: 60,
                    missingFields: ['systemName', 'owner', 'businessUnit'],
                    suggestedEnvironment: 'TEST',
                    suggestedCriticality: 'STANDARD',
                    lastSeenAt: new Date(),
                    networkLabel: 'VM Network 10',
                    createdByUserId: adminId,
                    tags: ['discovered', 'vcenter']
                }
            });
        }
    }

    // 4. Databases
    console.log('🗄️ Creating Databases...');
    const dbEngines = ['PostgreSQL', 'MySQL', 'Oracle', 'SQL Server', 'MongoDB'];
    for (let i = 1; i <= 15; i++) {
        const engine = dbEngines[Math.floor(Math.random() * dbEngines.length)];
        const env = environments[Math.floor(Math.random() * environments.length)];
        
        await prisma.databaseInventory.create({
            data: {
                name: `DB_${engine.replace(' ', '')}_${env}_${i}`,
                engine: engine,
                version: '15.4',
                environment: env,
                ipAddress: `172.16.20.${i}`,
                port: (engine === 'PostgreSQL' ? 5432 : engine === 'MySQL' ? 3306 : 1521).toString(),
                host: `db-host-${i}.internal`,
                serviceName: `svc_${engine.toLowerCase()}_${i}`,
                note: `Main ${engine} instance for ${env} workloads`,
                linkedApps: [`172.16.10.${i}`, `172.16.10.${i+10}`],
                createdByUserId: adminId,
                accounts: {
                    create: [
                        { username: 'dbadmin', encryptedPassword: encryptPassword('SecretPassword!'), role: 'DBA', privileges: ['ALL PRIVILEGES'] },
                        { username: 'app_user', encryptedPassword: encryptPassword('AppPassword123'), role: 'Application', privileges: ['SELECT', 'INSERT', 'UPDATE'] },
                        { username: 'readonly', encryptedPassword: encryptPassword('ReadPassword'), role: 'Report', privileges: ['SELECT'] }
                    ]
                }
            }
        });
    }

    console.log('✅ Large-scale seeding complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
