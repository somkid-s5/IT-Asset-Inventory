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
    console.log('🌱 Starting database reset & dummy data seeding (Phase 11)...');

    // 1. Create Default Admin User
    const adminPassword = await bcrypt.hash('SecureAdmin123!', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@infrapilot.local' },
        update: { passwordHash: adminPassword },
        create: {
            email: 'admin@infrapilot.local',
            passwordHash: adminPassword,
            role: 'ADMIN',
        },
    });
    console.log(`👤 Created Admin user: ${admin.email}`);

    // 2. Physical Hypervisors
    const host1 = await prisma.asset.create({
        data: {
            name: 'ESXi-Host-01',
            type: 'SERVER',
            status: 'ACTIVE',
            osVersion: 'VMware ESXi 8.0',
            owner: 'IT Infrastructure Team',
            environment: 'PROD',
            location: 'DC-BKK / Rack 04 / U12-U14',
            customMetadata: {
                brand: 'Dell',
                model: 'PowerEdge R750',
                serial_number: 'DELL-SV-10023',
                cpu_summary: '2x Intel Xeon Gold 6330',
                ram_gb: 512,
                storage_type: 'NVMe SSD',
                warranty_expire: '2028-12-31'
            },
            ipAllocations: {
                create: [
                    { address: '10.0.1.10', type: 'Management (iDRAC)' },
                    { address: '10.0.1.11', type: 'vMotion' }
                ]
            },
            createdByUserId: admin.id,
        }
    });

    const host2 = await prisma.asset.create({
        data: {
            name: 'ESXi-Host-02',
            type: 'SERVER',
            status: 'ACTIVE',
            osVersion: 'VMware ESXi 8.0',
            owner: 'IT Infrastructure Team',
            environment: 'PROD',
            location: 'DC-BKK / Rack 04 / U15-U17',
            customMetadata: {
                brand: 'Dell',
                model: 'PowerEdge R750',
                serial_number: 'DELL-SV-10024',
                ram_gb: 512,
            },
            ipAllocations: {
                create: [
                    { address: '10.0.1.12', type: 'Management' }
                ]
            },
            createdByUserId: admin.id,
        }
    });

    // 3. Network & Security Devices
    const switch1 = await prisma.asset.create({
        data: {
            name: 'Core-Switch-01',
            type: 'SERVER',
            status: 'ACTIVE',
            environment: 'PROD',
            location: 'DC-BKK / Rack 01 / U42',
            customMetadata: {
                brand: 'Cisco',
                model: 'Nexus 93180YC-EX',
                firmware: 'NXOS 9.3',
                stack_role: 'Master'
            },
            ipAllocations: {
                create: [{ address: '10.0.254.1', type: 'Management VLAN' }]
            },
            createdByUserId: admin.id,
        }
    });

    const fw1 = await prisma.asset.create({
        data: {
            name: 'PaloAlto-FW-Main',
            type: 'SERVER',
            status: 'ACTIVE',
            environment: 'PROD',
            location: 'DC-BKK / Rack 01 / U40',
            customMetadata: {
                brand: 'Palo Alto Networks',
                model: 'PA-3220',
                panos: '10.1.8',
                ha_status: 'Active'
            },
            ipAllocations: {
                create: [{ address: '10.0.254.254', type: 'Internal Gateway' }]
            },
            createdByUserId: admin.id,
        }
    });

    // 4. Virtual Machines (Web & DB Tier)
    const vm1 = await prisma.asset.create({
        data: {
            name: 'APP-SRV-01',
            type: 'VM',
            status: 'ACTIVE',
            osVersion: 'Ubuntu 24.04 LTS',
            parentId: host1.id,
            owner: 'App Dev Team',
            environment: 'PROD',
            location: 'DC-BKK / Virtual Cluster 1',
            customMetadata: { vCores: 8, ram_gb: 32 },
            ipAllocations: { create: [{ address: '10.0.5.50', type: 'Primary' }] },
            createdByUserId: admin.id,
        }
    });

    const web1 = await prisma.asset.create({
        data: {
            name: 'WEB-SRV-01',
            type: 'VM',
            status: 'ACTIVE',
            osVersion: 'Debian 12',
            parentId: host2.id,
            owner: 'Web Team',
            environment: 'PROD',
            customMetadata: { vCores: 4, ram_gb: 16, role: 'Nginx Load Balancer' },
            ipAllocations: { create: [{ address: '10.0.5.10', type: 'VIP' }] },
            createdByUserId: admin.id,
        }
    });

    const db1 = await prisma.asset.create({
        data: {
            name: 'DB-SRV-MAIN',
            type: 'VM',
            status: 'ACTIVE',
            osVersion: 'RHEL 9',
            parentId: host1.id,
            owner: 'DBA Team',
            environment: 'PROD',
            customMetadata: { vCores: 16, ram_gb: 128, db_engine: 'PostgreSQL 16' },
            ipAllocations: { create: [{ address: '10.0.6.100', type: 'Database Network' }] },
            createdByUserId: admin.id,
        }
    });

    // 5. Cloud/SaaS Applications
    const saasApp = await prisma.asset.create({
        data: {
            name: 'AWS RDS Finance',
            type: 'APP',
            status: 'ACTIVE',
            environment: 'PROD',
            owner: 'Finance Dept',
            location: 'ap-southeast-1 (Singapore)',
            customMetadata: { provider: 'AWS', service: 'RDS Aurora', instance_class: 'db.r6g.xlarge' },
            createdByUserId: admin.id,
        }
    });

    // 6. Create Massive Credentials Array
    console.log('🔑 Seeding encrypted credentials for diverse assets...');

    await prisma.credential.createMany({
        data: [
            // ESXi Hosts
            { assetId: host1.id, username: 'root', encryptedPassword: encryptPassword('HostAdminP@ss!'), lastChangedDate: new Date() },
            { assetId: host1.id, username: 'admin', encryptedPassword: encryptPassword('iDRAC_secure_123'), lastChangedDate: new Date() },
            { assetId: host2.id, username: 'root', encryptedPassword: encryptPassword('Host2AdminP@ss!'), lastChangedDate: new Date() },

            // Network & Security
            { assetId: switch1.id, username: 'admin', encryptedPassword: encryptPassword('cisco_enable_pwd!'), lastChangedDate: new Date() },
            { assetId: fw1.id, username: 'fwadmin', encryptedPassword: encryptPassword('PaloAlto!Sup3r'), lastChangedDate: new Date() },
            { assetId: fw1.id, username: 'api_readonly', encryptedPassword: encryptPassword('REST_TOKEN_9A8B7C'), lastChangedDate: new Date() },

            // App Server
            { assetId: vm1.id, username: 'ubuntu', encryptedPassword: encryptPassword('ubuntuVPX!99'), lastChangedDate: new Date() },
            { assetId: vm1.id, username: 'deploy_svc', encryptedPassword: encryptPassword('JenkinsKey_a8b!'), lastChangedDate: new Date() },

            // Web Server
            { assetId: web1.id, username: 'root', encryptedPassword: encryptPassword('debian_web_root!!'), lastChangedDate: new Date() },

            // Database Server (OS + DB Level)
            { assetId: db1.id, username: 'rhel_admin', encryptedPassword: encryptPassword('RedHat$3cure9'), lastChangedDate: new Date() },
            { assetId: db1.id, username: 'postgres_sys', encryptedPassword: encryptPassword('pgAdmin_Super!123'), lastChangedDate: new Date() },
            { assetId: db1.id, username: 'app_readonly', encryptedPassword: encryptPassword('readonly_app_pwd'), lastChangedDate: new Date() },

            // Cloud App
            { assetId: saasApp.id, username: 'master_aws_admin', encryptedPassword: encryptPassword('AwsAurora!Finance99'), lastChangedDate: new Date() },
            { assetId: saasApp.id, username: 'bi_reporting', encryptedPassword: encryptPassword('BI_Read_Token!#'), lastChangedDate: new Date() },
        ]
    });

    console.log('✅ Seed complete. A highly detailed, realistic IT Infrastructure with full Credentials has been populated!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
