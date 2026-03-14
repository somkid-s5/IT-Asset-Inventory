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
const path = __importStar(require("path"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Starting Grouped Asset Import from Book1.md...');
    const filePath = path.resolve(__dirname, '../Book1.md');
    let fileContent = '';
    try {
        fileContent = fs.readFileSync(filePath, 'utf8');
    }
    catch (e) {
        console.error(`Could not find Book1.md at ${filePath}`);
        process.exit(1);
    }
    const lines = fileContent.split('\n');
    const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
    });
    if (!adminUser) {
        throw new Error("Admin user not found. Please ensure the database is seeded.");
    }
    console.log('Clearing existing assets imported previously...');
    await prisma.asset.deleteMany({});
    console.log('Database cleared.');
    const assetsMap = {};
    let inTable = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('| ---')) {
            inTable = true;
            continue;
        }
        if (!inTable || !line.startsWith('|'))
            continue;
        const cols = line.split('|').map(c => c.trim()).slice(1, -1);
        if (cols.length < 13)
            continue;
        const assetId = cols[0];
        const name = cols[1];
        const typeStr = cols[2];
        const rack = cols[3];
        const location = cols[4];
        const osVersion = cols[5];
        const ipAddress = cols[6];
        const ipType = cols[7];
        const manageType = cols[8];
        const username = cols[9];
        const password = cols[10];
        const brandModel = cols[11];
        const sn = cols[12];
        if (!assetId || assetId === '')
            continue;
        let type = client_1.AssetType.SERVER;
        const upperType = typeStr.toUpperCase();
        if (upperType.includes('NETWORK') || upperType.includes('SWITCH'))
            type = client_1.AssetType.NETWORK;
        if (!assetsMap[assetId]) {
            assetsMap[assetId] = {
                assetId,
                name,
                type,
                osVersion,
                location: `${location} ${rack ? `- Rack: ${rack}` : ''}`.trim(),
                customMetadata: {
                    brandModel,
                    sn,
                    importedFrom: 'Book1.md'
                },
                ips: [],
                credentials: []
            };
        }
        const assetGroup = assetsMap[assetId];
        if (ipAddress && ipAddress !== '-') {
            if (!assetGroup.ips.some((ip) => ip.address === ipAddress && ip.type === ipType)) {
                assetGroup.ips.push({
                    address: ipAddress,
                    type: ipType || 'Primary'
                });
            }
        }
        if (username && username !== '-' && password && password !== '-') {
            const users = username.split('/').map(u => u.trim());
            const passes = password.split('/').map(p => p.trim());
            for (let j = 0; j < Math.max(users.length, passes.length); j++) {
                const u = users[j] || users[0];
                let p = passes[j] || passes[0];
                if (u && p && u !== '-') {
                    if (!assetGroup.credentials.some((c) => c.username === u && c.password === p)) {
                        assetGroup.credentials.push({
                            username: u,
                            password: p,
                            manageType: manageType || 'WEB/SSH'
                        });
                    }
                }
            }
        }
    }
    console.log(`Grouped into ${Object.keys(assetsMap).length} unique assets. Inserting to DB...`);
    let importedCount = 0;
    let failedCount = 0;
    for (const group of Object.values(assetsMap)) {
        try {
            await prisma.asset.create({
                data: {
                    assetId: group.assetId,
                    name: group.name,
                    type: group.type,
                    status: client_1.AssetStatus.ACTIVE,
                    osVersion: group.osVersion,
                    location: group.location,
                    createdByUserId: adminUser.id,
                    customMetadata: group.customMetadata,
                    ipAllocations: {
                        create: group.ips.map((ip) => ({
                            address: ip.address,
                            type: ip.type
                        }))
                    },
                    credentials: {
                        create: group.credentials.map((cred) => ({
                            username: cred.username,
                            encryptedPassword: cred.password,
                            lastChangedDate: new Date()
                        }))
                    }
                }
            });
            importedCount++;
            console.log(`Imported Asset: ${group.name} (${group.assetId}) with ${group.ips.length} IPs and ${group.credentials.length} Credentials.`);
        }
        catch (e) {
            console.error(`Failed to import asset ${group.name} (${group.assetId})`, e);
            failedCount++;
        }
    }
    console.log(`\nImport Summary:`);
    console.log(`Successfully imported: ${importedCount}`);
    console.log(`Failed: ${failedCount}`);
}
main()
    .catch(e => {
    console.error("Import failed:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=import-grouped.js.map