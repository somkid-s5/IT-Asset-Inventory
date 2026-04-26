import { PrismaClient, AssetStatus, AssetType, VmDiscoveryState, VmLifecycleState, Role, AuditAction, VmPowerState, VmEnvironment, VmCriticality } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function encryptPassword(text: string): string {
    const algorithm = 'aes-256-gcm';
    const secretKey =
        process.env.CREDENTIAL_ENCRYPTION_KEY ||
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
    console.log('🧹 Clearing existing data...');
    await prisma.auditLog.deleteMany();
    await prisma.databaseAccount.deleteMany();
    await prisma.databaseInventory.deleteMany();
    await prisma.vmGuestAccount.deleteMany();
    await prisma.vmInventory.deleteMany();
    await prisma.vmDiscovery.deleteMany();
    await prisma.vmVCenterSource.deleteMany();
    await prisma.credential.deleteMany();
    await prisma.patchInfo.deleteMany();
    await prisma.assetNote.deleteMany();
    await prisma.assetAttachment.deleteMany();
    await prisma.iPAllocation.deleteMany().catch(() => prisma.$queryRawUnsafe('DELETE FROM "IPAllocation"'));
    await prisma.asset.deleteMany();
    await prisma.user.deleteMany();

    console.log('🚀 Starting GOD-MODE simulation seed...');

    const adminPasswordHash = await bcrypt.hash('AssetOpsAdmin2026!', 10);
    const somkidPasswordHash = await bcrypt.hash('Somkid@2026', 10);

    const admin = await prisma.user.create({
        data: {
            username: 'admin',
            displayName: 'System Admin (Main)',
            email: 'admin@infra.local',
            passwordHash: adminPasswordHash,
            role: Role.ADMIN,
            avatarSeed: 'admin-main',
        },
    });

    const somkid = await prisma.user.create({
        data: {
            username: 'somkid.s',
            displayName: 'Somkid S. (Infrastructure Lead)',
            email: 'somkid.s@corp.local',
            passwordHash: somkidPasswordHash,
            role: Role.EDITOR,
            avatarSeed: 'somkid-lead',
        },
    });

    const depts = ['Cloud Engineering', 'DevOps Ops', 'Cyber Security', 'Network Infra'];
    const locs = ['BKK-DC-01', 'BKK-DC-02', 'DR-DATA-CENTER'];
    
    // 1. Core Switches
    console.log('🌐 Seeding Core Switches (100% Detail)...');
    for (let i = 1; i <= 2; i++) {
        const sw = await prisma.asset.create({
            data: {
                name: `NEXUS-CORE-SPINE-0${i}`,
                assetId: `NET-CORE-S${i}`,
                type: AssetType.SWITCH,
                environment: 'PROD',
                location: 'BKK-DC-01',
                rack: 'RACK-CORE-01',
                brandModel: 'Cisco Nexus 9336C-FX2',
                sn: `SN-NX-S${i}-${Math.random().toString(36).substring(7).toUpperCase()}`,
                status: AssetStatus.ACTIVE,
                department: 'Network Infra',
                owner: 'somkid.s',
                vendor: 'Cisco Systems Thailand',
                purchaseDate: new Date('2023-01-15'),
                warrantyExpiration: new Date('2026-01-15'),
                dependencies: 'Upstream ISP-A, ISP-B via BGP',
                osVersion: 'NX-OS 10.3(1)F',
                manageType: 'SSH/HTTPS',
                customMetadata: {
                    "Port Count": "36 x 100G",
                    "Throughput": "7.2 Tbps",
                    "MTU": "9216 (Jumbo Frames)",
                    "VPC Domain": "10",
                    "BGP AS": "65001"
                },
                ipAllocations: {
                    create: [
                        { address: `10.254.1.${i}`, type: 'Management', manageType: 'SSH/WEB', version: 'v10.3' },
                        { address: `10.254.1.${i+10}`, type: 'Loopback0', nodeLabel: 'VTEP' }
                    ]
                },
                credentials: {
                    create: [
                        { username: 'admin', encryptedPassword: encryptPassword('Nexus@2026!'), type: 'SSH', manageType: 'SSH' },
                        { username: 'ro_user', encryptedPassword: encryptPassword('ReadOnly_Pwd'), type: 'WEB', manageType: 'WEB' }
                    ]
                },
                notes: {
                    create: [
                        { content: 'Primary spine switch for the whole DC. Do not restart without approval.', createdByUserId: admin.id, isPinned: true },
                        { content: 'Fiber port 1/1 replaced on 2024-02-10 due to CRC errors.', createdByUserId: somkid.id },
                        { content: 'Firmware updated to 10.3.1F on last maintenance window.', createdByUserId: somkid.id }
                    ]
                },
                attachments: {
                    create: [
                        { filename: 'spine-rack-layout.png', storedPath: 'uploads/assets/rack-layout.png', mimeType: 'image/png', sizeBytes: 1024500, createdByUserId: admin.id },
                        { filename: 'nexus-hardware.png', storedPath: 'uploads/assets/nexus-9336.png', mimeType: 'image/png', sizeBytes: 850000, createdByUserId: admin.id }
                    ]
                },
                createdByUserId: admin.id
            }
        });
    }

    // 2. Chassis and Blades
    console.log('⚔️ Seeding Chassis & Blades (100% Detail)...');
    const chassis = await prisma.asset.create({
        data: {
            name: 'POWEREDGE-MX7000-01',
            assetId: 'SRV-CH-01',
            type: AssetType.SERVER,
            environment: 'PROD',
            location: 'BKK-DC-01',
            rack: 'RACK-SRV-01',
            brandModel: 'Dell PowerEdge MX7000',
            sn: 'DELL-CH-8827361',
            status: AssetStatus.ACTIVE,
            department: 'Cloud Engineering',
            owner: 'somkid.s',
            vendor: 'Dell EMC Thailand',
            purchaseDate: new Date('2022-05-10'),
            warrantyExpiration: new Date('2027-05-10'),
            dependencies: 'Core Switches 01/02',
            osVersion: 'OME-M 2.10',
            manageType: 'WEB/API',
            customMetadata: {
                "Fabric A": "MX5108n",
                "Fabric B": "MXG610s",
                "Power Supplies": "6 x 3000W Platinum",
                "Firmware": "2.10.10"
            },
            ipAllocations: {
                create: [
                    { address: '10.250.1.5', type: 'Management', manageType: 'WEB', version: 'v2.1' }
                ]
            },
            credentials: {
                create: [
                    { username: 'root', encryptedPassword: encryptPassword('DellAdmin!'), type: 'WEB', manageType: 'WEB' }
                ]
            },
            attachments: {
                create: { filename: 'chassis-view.png', storedPath: 'uploads/assets/dell-mx7000.png', mimeType: 'image/png', sizeBytes: 900000, createdByUserId: somkid.id }
            },
            createdByUserId: admin.id
        }
    });

    for (let j = 1; j <= 4; j++) {
        await prisma.asset.create({
            data: {
                name: `BLADE-ESXI-P01-N0${j}`,
                assetId: `SRV-BL-0${j}`,
                type: AssetType.SERVER,
                parentId: chassis.id,
                environment: 'PROD',
                location: 'BKK-DC-01',
                rack: 'RACK-SRV-01',
                brandModel: 'Dell MX750c',
                sn: `DELL-BL-${j}XX7`,
                status: AssetStatus.ACTIVE,
                department: 'Cloud Engineering',
                owner: 'somkid.s',
                vendor: 'Dell EMC',
                purchaseDate: new Date('2022-05-10'),
                warrantyExpiration: new Date('2027-05-10'),
                dependencies: 'MX7000 Chassis 01',
                osVersion: 'ESXi 8.0U2',
                manageType: 'WEB/SSH',
                customMetadata: {
                    "CPU": "2 x Intel Xeon Platinum 8380 (40C/80T)",
                    "RAM": "1024 GB DDR4-3200",
                    "Boot": "2 x 480GB BOSS-S2",
                    "NIC": "2 x QLogic 25GbE"
                },
                ipAllocations: {
                    create: [
                        { address: `10.10.1.${j}`, type: 'Management', manageType: 'WEB/SSH', version: '8.0.2' },
                        { address: `10.10.1.${j+10}`, type: 'iDRAC', manageType: 'WEB', version: 'v7.0' }
                    ]
                },
                credentials: {
                    create: [
                        { username: 'root', encryptedPassword: encryptPassword('HostRoot!'), type: 'OS', manageType: 'SSH' },
                        { username: 'admin', encryptedPassword: encryptPassword('iDRAC_Secret'), type: 'IPMI', manageType: 'WEB' }
                    ]
                },
                notes: {
                    create: [
                        { content: 'Primary host for the vSAN cluster.', createdByUserId: somkid.id, isPinned: true },
                        { content: 'Replaced thermal paste on CPU1 during PM.', createdByUserId: admin.id }
                    ]
                },
                createdByUserId: somkid.id
            }
        });
    }

    // 3. Storage
    console.log('💾 Seeding Storage (100% Detail)...');
    await prisma.asset.create({
        data: {
            name: 'PURE-STORAGE-PROD-01',
            assetId: 'STR-PURE-01',
            type: AssetType.STORAGE,
            environment: 'PROD',
            location: 'BKK-DC-01',
            rack: 'RACK-STR-01',
            brandModel: 'Pure FlashArray//X70',
            sn: 'PURE-77823-X',
            status: AssetStatus.ACTIVE,
            department: 'Cloud Engineering',
            owner: 'somkid.s',
            vendor: 'Pure Storage Thailand',
            purchaseDate: new Date('2023-06-01'),
            warrantyExpiration: new Date('2028-06-01'),
            dependencies: 'Fibre Channel Fabric A/B',
            osVersion: 'Purity 6.4.2',
            manageType: 'WEB/API',
            customMetadata: {
                "Raw Capacity": "250 TB",
                "Effective Capacity": "1.2 PB",
                "Controllers": "Dual Active-Active",
                "Data Reduction": "5.2:1"
            },
            ipAllocations: {
                create: [
                    { address: '10.50.1.20', type: 'Management-VIP', manageType: 'WEB', version: 'Purity 6.4' }
                ]
            },
            credentials: {
                create: [
                    { username: 'pureadmin', encryptedPassword: encryptPassword('PurePwd!2026'), type: 'WEB', manageType: 'WEB' }
                ]
            },
            notes: {
                create: { content: 'Storage array hosting all Tier-1 Production DBs.', createdByUserId: admin.id, isPinned: true }
            },
            createdByUserId: admin.id
        }
    });

    // 4. Virtual Machines
    console.log('☁️ Seeding VMs (100% Detail)...');
    const vcenter = await prisma.vmVCenterSource.create({
        data: {
            name: 'VC-PROD-BANGKOK',
            endpoint: 'https://vcenter.corp.local/sdk',
            version: '8.0.2',
            username: 'administrator@vsphere.local',
            encryptedPassword: encryptPassword('vCenterPwd!'),
            syncInterval: '15 min',
            status: 'CONNECTED',
            lastSyncAt: new Date(),
            createdByUserId: somkid.id,
            notes: 'Main production vCenter. Critical for all operations.'
        }
    });

    const vmConfigs = [
        { name: 'K8S-MASTER-01', role: 'Kubernetes Master', os: 'Ubuntu 22.04', cpu: 8, ram: 16, disk: 100, bu: 'Cloud Native' },
        { name: 'SAP-HANA-DB-01', role: 'ERP Database', os: 'SLES 15 SP4', cpu: 64, ram: 1024, disk: 5000, bu: 'Finance' },
        { name: 'ACTIVE-DIR-01', role: 'Domain Controller', os: 'Windows 2022', cpu: 4, ram: 16, disk: 150, bu: 'Identity' },
        { name: 'MONITOR-NODE-01', role: 'Prometheus Stack', os: 'Ubuntu 22.04', cpu: 16, ram: 32, disk: 500, bu: 'IT Ops' }
    ];

    for (const config of vmConfigs) {
        await prisma.vmInventory.create({
            data: {
                name: config.name,
                systemName: `${config.name.toLowerCase()}.corp.local`,
                environment: VmEnvironment.PROD,
                serviceRole: config.role,
                description: `Primary ${config.role} for ${config.bu} division.`,
                primaryIp: `172.16.10.${Math.floor(Math.random() * 200)}`,
                host: 'BLADE-ESXI-P01-N01',
                cluster: 'PROD-COMPUTE-CLUSTER',
                moid: `vm-${Math.floor(Math.random() * 10000)}`,
                powerState: VmPowerState.RUNNING,
                guestOs: config.os,
                cpuCores: config.cpu,
                memoryGb: config.ram,
                storageGb: config.disk,
                disks: [
                    { label: 'OS Drive', sizeGb: 100, datastore: 'PURE-PROD-GOLD' },
                    { label: 'Data Drive', sizeGb: config.disk - 100, datastore: 'PURE-PROD-SILVER' }
                ],
                networkLabel: 'VLAN-100-PROD',
                lifecycleState: VmLifecycleState.ACTIVE,
                syncState: 'Synced',
                sourceId: vcenter.id,
                lastSyncAt: new Date(),
                owner: 'somkid.s',
                businessUnit: config.bu,
                slaTier: 'Platinum',
                criticality: VmCriticality.MISSION_CRITICAL,
                createdByUserId: somkid.id,
                notes: `Provisioned as per Ticket #REQ-${Math.floor(Math.random() * 1000)}. High performance node.`,
                guestAccounts: {
                    create: [
                        { username: 'admin_ops', encryptedPassword: encryptPassword('LinuxAdmin!'), role: 'Administrator', accessMethod: 'SSH' },
                        { username: 'backup_svc', encryptedPassword: encryptPassword('BackupPwd'), role: 'Backup', accessMethod: 'Veeam' }
                    ]
                }
            }
        });
    }

    // 5. Databases
    console.log('💎 Seeding Databases (100% Detail)...');
    await prisma.databaseInventory.create({
        data: {
            name: 'DB-ERP-HANA-PROD',
            engine: 'SAP HANA',
            version: '2.00.065',
            environment: 'PROD',
            ipAddress: '172.20.10.50',
            port: '30015',
            host: 'sap-hana-db-01.corp.local',
            serviceName: 'HANA_PRD',
            status: 'HEALTHY',
            backupPolicy: 'Log Backup: 15m, Data Backup: 24h',
            replication: 'HANA System Replication (Sync)',
            maintenanceWindow: 'Sunday 01:00-05:00',
            owner: 'db-admins',
            note: 'Core ERP database for the entire company. Do not touch.',
            linkedApps: ['SAP S/4HANA', 'Financial Portal', 'Supply Chain API'],
            createdByUserId: somkid.id,
            accounts: {
                create: [
                    { username: 'SYSTEM', encryptedPassword: encryptPassword('HanaSystemPwd!'), role: 'DBA', privileges: ['ALL'], note: 'System Superuser' },
                    { username: 'SAP_SRV', encryptedPassword: encryptPassword('SrvPwd_456'), role: 'App', privileges: ['SELECT', 'UPDATE'], note: 'Application Service' }
                ]
            }
        }
    });

    // 6. Audit Logs (Realistic History)
    console.log('📜 Seeding Audit Logs (Realistic)...');
    const auditActions = [
        { u: somkid.id, a: AuditAction.LOGIN, d: 'Logged in from 10.15.0.22 (BKK Office)' },
        { u: admin.id, a: AuditAction.CREATE_USER, d: 'Created user account: somkid.s (Infrastructure Lead)' },
        { u: somkid.id, a: AuditAction.VIEW_PASSWORD, d: 'Revealed password for root on BLADE-ESXI-P01-N01' },
        { u: somkid.id, a: AuditAction.UPDATE_ASSET, d: 'Modified Specifications for NEXUS-CORE-SPINE-01: Added BGP AS detail' },
        { u: somkid.id, a: AuditAction.CREATE_VM, d: 'Promoted VM K8S-MASTER-01 to Production Inventory' },
        { u: admin.id, a: AuditAction.VCENTER_SYNC, d: 'Manual vCenter Sync initiated: 48 VMs updated, 2 new drafts discovered' }
    ];

    for (let i = 0; i < 50; i++) {
        const item = auditActions[i % auditActions.length];
        const ts = new Date();
        ts.setDate(ts.getDate() - (50 - i));
        await prisma.auditLog.create({
            data: {
                userId: item.u,
                action: item.a,
                ipAddress: `10.15.0.${100+i}`,
                details: item.d,
                timestamp: ts
            }
        });
    }

    console.log('✅ GOD-MODE simulation seed complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
