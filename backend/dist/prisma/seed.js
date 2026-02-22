"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const crypto = __importStar(require("crypto"));
const prisma = new client_1.PrismaClient();
function encryptPasswordForSeed(password, hexKey) {
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
    console.log('Clearing old data...');
    await prisma.auditLog.deleteMany();
    await prisma.credential.deleteMany();
    await prisma.patchInfo.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.user.deleteMany();
    console.log('Old data cleared. Starting seed...');
    const adminPasswordHash = await bcrypt.hash('P@ssw0rd', 10);
    const adminValue = await prisma.user.create({
        data: {
            email: 'admin@test.test',
            passwordHash: adminPasswordHash,
            role: client_1.Role.ADMIN,
        },
    });
    console.log(`Created admin user: ${adminValue.email}`);
    const editorPasswordHash = await bcrypt.hash('editor123', 10);
    const editorValue = await prisma.user.create({
        data: {
            email: 'soc-analyst@infrapilot.local',
            passwordHash: editorPasswordHash,
            role: client_1.Role.EDITOR,
        }
    });
    const assetsData = [
        {
            name: 'db-prod-01',
            type: client_1.AssetType.DB,
            ipAddress: '10.0.1.45',
            macAddress: '00:1B:44:11:3A:B7',
            osVersion: 'Ubuntu 22.04 LTS',
            status: client_1.AssetStatus.ACTIVE,
            department: 'Database Admins',
            owner: 'db-team',
            patchInfo: {
                create: {
                    currentVersion: 'PG-14.2',
                    latestVersion: 'PG-14.8',
                    eolDate: new Date('2025-12-31'),
                    lastPatchedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 190),
                }
            }
        },
        {
            name: 'web-front-lb',
            type: client_1.AssetType.SERVER,
            ipAddress: '10.0.2.12',
            osVersion: 'NGINX Alpine',
            status: client_1.AssetStatus.ACTIVE,
            department: 'Web Infrastructure',
            owner: 'web-team',
            patchInfo: {
                create: {
                    currentVersion: '1.24.0',
                    latestVersion: '1.24.0',
                    eolDate: new Date('2026-06-30'),
                    lastPatchedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
                }
            }
        },
        {
            name: 'auth-service-vm',
            type: client_1.AssetType.VM,
            ipAddress: '10.0.5.99',
            osVersion: 'Windows Server 2019',
            status: client_1.AssetStatus.ACTIVE,
            department: 'Security',
            patchInfo: {
                create: {
                    currentVersion: 'Win-2019-B2',
                    latestVersion: 'Win-2019-B5',
                    eolDate: new Date('2029-01-09'),
                    lastPatchedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90),
                }
            }
        },
        {
            name: 'internal-wiki',
            type: client_1.AssetType.APP,
            ipAddress: '10.0.8.20',
            osVersion: 'Confluence 8.0',
            status: client_1.AssetStatus.ACTIVE,
            department: 'IT Support',
        },
        {
            name: 'legacy-app-server',
            type: client_1.AssetType.SERVER,
            ipAddress: '10.0.1.100',
            osVersion: 'Windows Server 2008 R2',
            status: client_1.AssetStatus.DECOMMISSIONED,
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
    const encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
    if (!encryptionKey) {
        console.warn("WARNING: CREDENTIAL_ENCRYPTION_KEY is not defined in the environment. Credentials will not be seeded.");
        return;
    }
    if (Buffer.from(encryptionKey, 'hex').length !== 32) {
        console.warn("WARNING: CREDENTIAL_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Skipping credentials.");
        return;
    }
    console.log('Seeding credentials...');
    await prisma.credential.create({
        data: {
            assetId: createdAssets[0].id,
            username: 'postgres_admin',
            encryptedPassword: encryptPasswordForSeed('SuperSecretDBPass123!', encryptionKey),
            lastChangedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120)
        }
    });
    await prisma.credential.create({
        data: {
            assetId: createdAssets[1].id,
            username: 'root',
            encryptedPassword: encryptPasswordForSeed('Nginx#Root!2024', encryptionKey),
            lastChangedDate: new Date()
        }
    });
    await prisma.credential.create({
        data: {
            assetId: createdAssets[2].id,
            username: 'Administrator',
            encryptedPassword: encryptPasswordForSeed('P@ssw0rdWin2019', encryptionKey),
            lastChangedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 300)
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
//# sourceMappingURL=seed.js.map