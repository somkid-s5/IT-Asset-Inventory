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
const fs = __importStar(require("fs"));
const sync_1 = require("csv-parse/sync");
const crypto = __importStar(require("crypto"));
const prisma = new client_1.PrismaClient();
const algorithm = 'aes-256-gcm';
const secretKey = process.env.ENCRYPTION_KEY || '12345678123456781234567812345678';
function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}
async function main() {
    console.log('Starting Extended CSV Migration...');
    let ownerUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!ownerUser) {
        ownerUser = await prisma.user.create({
            data: {
                email: 'admin@infrapilot.local',
                passwordHash: '$2b$10$8P.mIvz.pAnrl5w1ekwz8eY983MH3vkmYA336qgT0Fbf1dz8SP1Si',
                role: 'ADMIN',
            }
        });
        console.log('Created default admin user for asset ownership.');
    }
    const filesToImport = [
        '/home/smart/Private/Project/IT-Asset-Inventory/Flie_Password_Update_09-01-69(192.168.60.csv',
        '/home/smart/Private/Project/IT-Asset-Inventory/backend/prisma/xlsx_export_Land_System.csv',
        '/home/smart/Private/Project/IT-Asset-Inventory/backend/prisma/xlsx_export____________Auction_.csv',
        '/home/smart/Private/Project/IT-Asset-Inventory/backend/prisma/xlsx_export_Remote_+Vcenter.csv',
        '/home/smart/Private/Project/IT-Asset-Inventory/backend/prisma/xlsx_export_NBU.csv'
    ];
    let totalSuccessCount = 0;
    for (const filePath of filesToImport) {
        if (!fs.existsSync(filePath)) {
            console.log(`Skipping missing file: ${filePath}`);
            continue;
        }
        console.log(`\nProcessing: ${filePath}`);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split('\n');
        let headerLineIndex = -1;
        for (let i = 0; i < Math.min(15, lines.length); i++) {
            const rowStr = lines[i] || '';
            if (rowStr.includes('IP Address') && rowStr.includes('Username')) {
                headerLineIndex = i;
                break;
            }
        }
        if (headerLineIndex === -1) {
            console.log(`  -> Could not find valid headers. Skipping file.`);
            continue;
        }
        const dataLines = lines.slice(headerLineIndex).join('\n');
        try {
            const records = (0, sync_1.parse)(dataLines, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
                relax_column_count: true
            });
            console.log(`  Found ${records.length} records in this file.`);
            let count = 0;
            for (const rawRecord of records) {
                const record = rawRecord;
                const ipAddress = record[' IP Address'] || record['IP Address'];
                if (!ipAddress || ipAddress.toLowerCase() === 'ip ว่าง' || ipAddress === '')
                    continue;
                const rackStatus = record['Rack'] || '';
                let isStatusActive = false;
                if (rackStatus && !rackStatus.toLowerCase().includes('free') && !rackStatus.toLowerCase().includes('close')) {
                    isStatusActive = true;
                }
                let assetType = 'SERVER';
                const brand = record['Brand/Model']?.toLowerCase() || '';
                const system = record['System']?.toLowerCase() || '';
                if (brand.includes('vmware') || system.includes('vm'))
                    assetType = 'VM';
                if (record['Database Type'] || record['Database Name/SID'])
                    assetType = 'DB';
                let name = record['DisplayName'] || record[' IP Address'] || record['IP Address'];
                const spec = record['Specification'] || '';
                if (spec.includes('DisplayName :')) {
                    const match = spec.match(/DisplayName\s*:\s*([^\n]+)/);
                    if (match)
                        name = match[1].trim();
                }
                let parentId = undefined;
                if (assetType === 'VM' && system && system !== '') {
                    let parentAsset = await prisma.asset.findFirst({
                        where: { name: system, type: 'SERVER' }
                    });
                    if (!parentAsset) {
                        parentAsset = await prisma.asset.create({
                            data: {
                                name: system,
                                type: 'SERVER',
                                status: 'ACTIVE',
                                department: rackStatus || 'IT',
                                createdByUserId: ownerUser.id,
                            }
                        });
                    }
                    parentId = parentAsset.id;
                }
                try {
                    const asset = await prisma.asset.create({
                        data: {
                            name: name,
                            type: assetType,
                            osVersion: record['Operating System'] || 'Unknown OS',
                            status: isStatusActive ? 'ACTIVE' : 'MAINTENANCE',
                            department: rackStatus || 'IT',
                            createdByUserId: ownerUser.id,
                            parentId: parentId,
                            ipAllocations: {
                                create: [{ address: ipAddress, type: 'Management/Primary' }]
                            }
                        }
                    });
                    const username = record['Username'];
                    const password = record['Password'];
                    if (username && password && password !== '-' && password !== 'ไม่มี') {
                        await prisma.credential.create({
                            data: {
                                assetId: asset.id,
                                username: username,
                                encryptedPassword: encrypt(password),
                                lastChangedDate: new Date(),
                            }
                        });
                    }
                    const dbCredentials = record['U & P Database'] || record['U & P to Connect Database'];
                    if (dbCredentials && dbCredentials !== '-') {
                        await prisma.credential.create({
                            data: {
                                assetId: asset.id,
                                username: 'db_admin',
                                encryptedPassword: encrypt(dbCredentials),
                                lastChangedDate: new Date(),
                            }
                        });
                    }
                    count++;
                }
                catch (assetErr) {
                    console.error(`    Failed to migrate IP ${ipAddress}:`, assetErr.message);
                }
            }
            console.log(`  -> Successfully imported ${count} assets from this file.`);
            totalSuccessCount += count;
        }
        catch (parseErr) {
            console.error(`  -> Failed to parse CSV data:`, parseErr.message);
        }
    }
    console.log(`\nExtended Migration complete! Successfully imported a total of ${totalSuccessCount} additional assets.`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-csv.js.map