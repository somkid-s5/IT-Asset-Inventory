import { PrismaClient, AssetType, AssetStatus } from '@prisma/client';
import * as xlsx from 'xlsx';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Asset Import...');
    
    // Read the file keeping in mind it might not be perfect UTF-8
    const workbook = xlsx.readFile('Book1.csv', { type: 'file' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Read the array of arrays to find exactly where the headers start
    const rows: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Find the header row (it usually starts with Asset ID)
    let headerRowIndex = 0;
    for (let i = 0; i < rows.length; i++) {
        if (rows[i] && rows[i].length > 0 && typeof rows[i][0] === 'string' && rows[i][0].includes('Asset ID')) {
            headerRowIndex = i;
            break;
        }
    }

    console.log(`Found headers at row index: ${headerRowIndex}`);

    // Map headers safely, extracting out the noisy new lines and Thai chars
    const headers = rows[headerRowIndex].map(h => {
        if (!h) return '';
        const hdr = String(h);
        if (hdr.includes('Asset ID')) return 'assetId';
        if (hdr.includes('Asset Name')) return 'name';
        if (hdr.includes('Asset Type')) return 'type';
        if (hdr.includes('OS Version')) return 'osVersion';
        if (hdr.includes('IP Address')) return 'ipAddress';
        if (hdr.includes('Management')) return 'manageType';
        if (hdr.includes('Username')) return 'username';
        if (hdr.includes('Password')) return 'password';
        if (hdr.includes('Rack')) return 'rack';
        if (hdr.includes('Location')) return 'location';
        return hdr;
    });

    console.log("Mapped Headers:", headers);

    const dataRows = rows.slice(headerRowIndex + 1);
    console.log(`Found ${dataRows.length} potential records in the file.`);

    // Get the admin user to attribute these items to
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
            // Build an object for the row based on the mapped headers
            const record: any = {};
            for (let i = 0; i < headers.length; i++) {
                if (headers[i]) {
                    record[headers[i]] = row[i];
                }
            }

            const assetId = record['assetId'] ? String(record['assetId']).trim() : null;
            const name = record['name'] ? String(record['name']).trim() : null;
            const osVersion = record['osVersion'] ? String(record['osVersion']).trim() : null;
            const ipAddress = record['ipAddress'] ? String(record['ipAddress']).trim() : null;
            
            // Skip totally empty rows or rows without a name
            if (!name || name === 'undefined' || name === '') {
                continue;
            }

            console.log(`Importing: ${name} ${assetId ? `(ID: ${assetId})` : ''}`);

            const asset = await prisma.asset.create({
                data: {
                    assetId: assetId || undefined,
                    name: name,
                    type: AssetType.SERVER, // Defaulting to SERVER
                    status: AssetStatus.ACTIVE,
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
                        rawRecord: record // Storing full original mapped record
                    }
                }
            });

            importedCount++;
        } catch (error) {
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
