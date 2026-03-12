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
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Starting Custom CSV Import Parse...');
    const fileContent = fs.readFileSync('Book1.csv', 'utf8');
    const lines = fileContent.split('\n');
    const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
    });
    if (!adminUser) {
        throw new Error("Admin user not found. Please ensure the database is seeded.");
    }
    let importedCount = 0;
    let failedCount = 0;
    for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line)
            continue;
        const row = [];
        let inQuotes = false;
        let currentValue = '';
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            }
            else if (char === ',' && !inQuotes) {
                row.push(currentValue.trim());
                currentValue = '';
            }
            else {
                currentValue += char;
            }
        }
        row.push(currentValue.trim());
        if (row.length >= 2 && row[1] && row[1].length > 1 && !row[1].includes('Asset Name')) {
            const assetId = row[0] || null;
            const name = row[1] || null;
            const typeStr = row[2] || 'SERVER';
            const rack = row[3] || null;
            const location = row[4] || null;
            const osVersion = row[5] || null;
            const ipAddress = row[6] || null;
            try {
                let type = client_1.AssetType.SERVER;
                if (typeStr.toUpperCase().includes('VM'))
                    type = client_1.AssetType.VM;
                if (typeStr.toUpperCase().includes('DB'))
                    type = client_1.AssetType.DB;
                if (typeStr.toUpperCase().includes('APP'))
                    type = client_1.AssetType.APP;
                if (typeStr.toUpperCase().includes('NETWORK'))
                    type = client_1.AssetType.NETWORK;
                console.log(`Importing: ${name} (ID: ${assetId})`);
                await prisma.asset.upsert({
                    where: {
                        id: 'dummy-id-to-force-create'
                    },
                    update: {},
                    create: {
                        assetId: assetId,
                        name: name ?? 'Unknown Asset',
                        type: type,
                        status: client_1.AssetStatus.ACTIVE,
                        osVersion: osVersion,
                        location: location ? `${location} ${rack ? `- Rack: ${rack}` : ''}` : null,
                        createdByUserId: adminUser.id,
                        ipAllocations: ipAddress ? {
                            create: [
                                { address: ipAddress, type: 'Primary' }
                            ]
                        } : undefined,
                        customMetadata: {
                            importedFrom: 'Book1.csv_custom',
                            rawLine: line
                        }
                    }
                }).catch(async () => {
                    await prisma.asset.create({
                        data: {
                            assetId: assetId,
                            name: name ?? 'Unknown Asset',
                            type: type,
                            status: client_1.AssetStatus.ACTIVE,
                            osVersion: osVersion,
                            location: location ? `${location} ${rack ? `- Rack: ${rack}` : ''}` : null,
                            createdByUserId: adminUser.id,
                            ipAllocations: ipAddress ? {
                                create: [
                                    { address: ipAddress, type: 'Primary' }
                                ]
                            } : undefined,
                            customMetadata: {
                                importedFrom: 'Book1.csv_custom',
                                rawLine: line
                            }
                        }
                    });
                });
                importedCount++;
            }
            catch (error) {
                console.error(`Failed on row: ${name}`);
                failedCount++;
            }
        }
    }
    console.log(`\nImport Summary:`);
    console.log(`Successfully imported: ${importedCount}`);
    console.log(`Failed (or skipped): ${failedCount}`);
}
main()
    .catch(e => {
    console.error("Import failed:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=import-custom.js.map