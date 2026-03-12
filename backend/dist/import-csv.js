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
const xlsx = __importStar(require("xlsx"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Starting Asset Import...');
    const workbook = xlsx.readFile('Book1.csv', { type: 'file' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    let headerRowIndex = 0;
    for (let i = 0; i < rows.length; i++) {
        if (rows[i] && rows[i].length > 0 && typeof rows[i][0] === 'string' && rows[i][0].includes('Asset ID')) {
            headerRowIndex = i;
            break;
        }
    }
    console.log(`Found headers at row index: ${headerRowIndex}`);
    const headers = rows[headerRowIndex].map(h => {
        if (!h)
            return '';
        const hdr = String(h);
        if (hdr.includes('Asset ID'))
            return 'assetId';
        if (hdr.includes('Asset Name'))
            return 'name';
        if (hdr.includes('Asset Type'))
            return 'type';
        if (hdr.includes('OS Version'))
            return 'osVersion';
        if (hdr.includes('IP Address'))
            return 'ipAddress';
        if (hdr.includes('Management'))
            return 'manageType';
        if (hdr.includes('Username'))
            return 'username';
        if (hdr.includes('Password'))
            return 'password';
        if (hdr.includes('Rack'))
            return 'rack';
        if (hdr.includes('Location'))
            return 'location';
        return hdr;
    });
    console.log("Mapped Headers:", headers);
    const dataRows = rows.slice(headerRowIndex + 1);
    console.log(`Found ${dataRows.length} potential records in the file.`);
    const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
    });
    if (!adminUser) {
        throw new Error("Admin user not found. Please ensure the database is seeded.");
    }
    let importedCount = 0;
    let failedCount = 0;
    for (const row of dataRows) {
        try {
            const record = {};
            for (let i = 0; i < headers.length; i++) {
                if (headers[i]) {
                    record[headers[i]] = row[i];
                }
            }
            const assetId = record['assetId'] ? String(record['assetId']).trim() : null;
            const name = record['name'] ? String(record['name']).trim() : null;
            const osVersion = record['osVersion'] ? String(record['osVersion']).trim() : null;
            const ipAddress = record['ipAddress'] ? String(record['ipAddress']).trim() : null;
            if (!name || name === 'undefined' || name === '') {
                continue;
            }
            console.log(`Importing: ${name} ${assetId ? `(ID: ${assetId})` : ''}`);
            const asset = await prisma.asset.create({
                data: {
                    assetId: assetId || undefined,
                    name: name,
                    type: client_1.AssetType.SERVER,
                    status: client_1.AssetStatus.ACTIVE,
                    osVersion: osVersion,
                    createdByUserId: adminUser.id,
                    ipAllocations: ipAddress ? {
                        create: [
                            { address: ipAddress, type: 'Primary' }
                        ]
                    } : undefined,
                    customMetadata: {
                        importedFrom: 'Book1.csv',
                        location: record['location'],
                        rack: record['rack'],
                        manageType: record['manageType'],
                        rawRecord: record
                    }
                }
            });
            importedCount++;
        }
        catch (error) {
            console.error(`Failed to import record!`);
            console.error(error);
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
//# sourceMappingURL=import-csv.js.map