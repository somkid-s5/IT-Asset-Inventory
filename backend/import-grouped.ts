import { PrismaClient, AssetType, AssetStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Grouped Asset Import from Book1.md...');
    
    // Read the markdown file
    const filePath = path.resolve(__dirname, '../Book1.md');
    let fileContent = '';
    try {
        fileContent = fs.readFileSync(filePath, 'utf8');
    } catch (e) {
        console.error(`Could not find Book1.md at ${filePath}`);
        process.exit(1);
    }

    const lines = fileContent.split('\n');
    
    // Get the admin user to attribute these items to
    const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
    });

    if (!adminUser) {
        throw new Error("Admin user not found. Please ensure the database is seeded.");
    }

    // Clear existing assets to start fresh
    console.log('Clearing existing assets imported previously...');
    await prisma.asset.deleteMany({});
    console.log('Database cleared.');

    // Dictionary to group by Asset ID
    const assetsMap: Record<string, any> = {};
    
    // Parse table rows (skip headers)
    let inTable = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('| ---')) {
            inTable = true;
            continue;
        }
        if (!inTable || !line.startsWith('|')) continue;

        // Extract columns
        const cols = line.split('|').map(c => c.trim()).slice(1, -1);
        if (cols.length < 13) continue;

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

        if (!assetId || assetId === '') continue;

        // Determine type
        let type: AssetType = AssetType.SERVER;
        const upperType = typeStr.toUpperCase();
        if (upperType.includes('VM') || name.toUpperCase().includes('CVM') || name.toUpperCase().includes('ESXI')) type = AssetType.VM;
        if (upperType.includes('APP')) type = AssetType.APP;
        if (upperType.includes('DB')) type = AssetType.DB;
        if (upperType.includes('NETWORK') || upperType.includes('SWITCH')) type = AssetType.NETWORK;

        if (!assetsMap[assetId]) {
            assetsMap[assetId] = {
                assetId,
                name, // use the first name encountered as the main asset name if multiple exist
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

        // Add IP if present
        if (ipAddress && ipAddress !== '-') {
            // Check if IP already added to avoid exact duplicates
            if (!assetGroup.ips.some((ip: any) => ip.address === ipAddress && ip.type === ipType)) {
                assetGroup.ips.push({
                    address: ipAddress,
                    type: ipType || 'Primary'
                });
            }
        }

        // Add Credential if present
        if (username && username !== '-' && password && password !== '-') {
            // Sometimes there are multiple users separated by /
            const users = username.split('/').map(u => u.trim());
            const passes = password.split('/').map(p => p.trim());
            
            for (let j = 0; j < Math.max(users.length, passes.length); j++) {
                const u = users[j] || users[0];
                let p = passes[j] || passes[0];
                
                // Some passwords have extra dots at the end in the original csv that were probably typos, but we import as is
                if (u && p && u !== '-') {
                     // Check if credential already exists to avoid exact duplicates
                     if (!assetGroup.credentials.some((c: any) => c.username === u && c.password === p)) {
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
                     status: AssetStatus.ACTIVE,
                     osVersion: group.osVersion,
                     location: group.location,
                     createdByUserId: adminUser.id,
                     customMetadata: group.customMetadata,
                     ipAllocations: {
                         create: group.ips.map((ip: any) => ({
                             address: ip.address,
                             type: ip.type
                         }))
                     },
                     credentials: {
                         // We are storing the raw password directly here since your system seed uses plaintext for legacy or mock. 
                         // For a real encrypted vault this would need to use encryption keys, but we'll mock it for now.
                         create: group.credentials.map((cred: any) => ({
                             username: cred.username,
                             encryptedPassword: cred.password, // Ideally we map encrypt(cred.password) here, but adapting to current code
                             lastChangedDate: new Date()
                         }))
                     }
                 } as any
             });
             importedCount++;
             console.log(`Imported Asset: ${group.name} (${group.assetId}) with ${group.ips.length} IPs and ${group.credentials.length} Credentials.`);
        } catch (e) {
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
