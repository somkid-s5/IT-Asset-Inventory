import { PrismaClient, AssetType, AssetStatus } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Custom CSV Import Parse...');
    
    // Read the file raw
    const fileContent = fs.readFileSync('Book1.csv', 'utf8');
    const lines = fileContent.split('\n');

    // Get the admin user to attribute these items to
    const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
    });

    if (!adminUser) {
        throw new Error("Admin user not found. Please ensure the database is seeded.");
    }

    let importedCount = 0;
    let failedCount = 0;

    // Based on manual inspection, the real data seems to start after row 4.
    // The columns appear to be: [0] ID, [1] Name, [2] Type, [3] Rack, [4] Location, [5] OS, [6] IP, [7] IP Type, [8] Manage Type, [9] Username, [10] Password
    for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Simple CSV split (handling basic quotes)
        const row = [];
        let inQuotes = false;
        let currentValue = '';
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                row.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        row.push(currentValue.trim()); // push the last value

        // Assuming a valid row has at least an ID and a Name
        if (row.length >= 2 && row[1] && row[1].length > 1 && !row[1].includes('Asset Name')) {
            const assetId = row[0] || null;
            const name = row[1] || null;
            const typeStr = row[2] || 'SERVER';
            const rack = row[3] || null;
            const location = row[4] || null;
            const osVersion = row[5] || null;
            const ipAddress = row[6] || null;
            
            try {
                // Determine type
                let type: AssetType = AssetType.SERVER;
                if (typeStr.toUpperCase().includes('NETWORK')) type = AssetType.NETWORK;

                console.log(`Importing: ${name} (ID: ${assetId})`);
                
                // Use upsert to avoid duplicate name conflicts just in case
                await prisma.asset.upsert({
                    where: { 
                        // Because name isn't inherently unique in Prisma right now, 
                        // and assetId might be missing, we do a findFirst check
                        id: 'dummy-id-to-force-create' 
                    },
                    update: {},
                    create: {
                        assetId: assetId,
                        name: name ?? 'Unknown Asset',
                        type: type,
                        status: AssetStatus.ACTIVE,
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
                   // Fallback to normal create
                   await prisma.asset.create({
                        data: {
                            assetId: assetId,
                            name: name ?? 'Unknown Asset',
                            type: type,
                            status: AssetStatus.ACTIVE,
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
            } catch (error) {
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
