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
function encryptPassword(text) {
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
    console.log('🌱 Starting hardware-focused database seeding...');
    const adminPassword = await bcrypt.hash('admin123', 10);
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
    console.log('🔑 Seeding encrypted credentials...');
    await prisma.credential.createMany({
        data: [
            { assetId: server1.id, username: 'administrator', type: 'iLO', encryptedPassword: encryptPassword('ZYHMSWL2'), lastChangedDate: new Date() },
            { assetId: storage1.id, username: '3paradm', type: 'SSH', encryptedPassword: encryptPassword('3pardata'), lastChangedDate: new Date() },
            { assetId: switch1.id, username: 'admin', type: 'WEB/SSH', encryptedPassword: encryptPassword('P@ssw0rd'), lastChangedDate: new Date() },
        ]
    });
    console.log('✅ Seed complete. Hardware-only focus applied.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-dummy.js.map