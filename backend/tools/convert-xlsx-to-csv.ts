import * as xlsx from 'xlsx';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';

const filePath = '/home/smart/Private/Project/IT-Asset-Inventory/Flie_Password_Update_09-01-69.xlsx';
const workbook = xlsx.readFile(filePath);

// We will target sheets that clearly have the same structure as the previous CSV:
// e.g., 'Land_System', 'ระบบประมูล(Auction)'
const targetSheets = ['Land_System', 'ระบบประมูล(Auction)', 'Remote +Vcenter', 'NBU'];

for (const sheetName of targetSheets) {
    if (!workbook.SheetNames.includes(sheetName)) continue;

    console.log(`Extracting data from sheet: ${sheetName}`);
    const worksheet = workbook.Sheets[sheetName];

    // Convert directly to CSV string
    const csvContent = xlsx.utils.sheet_to_csv(worksheet, { blankrows: false });

    // Write out the raw CSV files for inspection and backend seeding
    const safeName = sheetName.replace(/[^a-zA-Z0-9_\-\+]/g, '_');
    const outPath = `/home/smart/Private/Project/IT-Asset-Inventory/backend/prisma/xlsx_export_${safeName}.csv`;
    fs.writeFileSync(outPath, csvContent, 'utf-8');

    console.log(`Saved: ${outPath}`);
}
