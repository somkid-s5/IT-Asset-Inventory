import * as xlsx from 'xlsx';

const filePath = '/home/smart/Private/Project/IT-Asset-Inventory/Flie_Password_Update_09-01-69.xlsx';
console.log(`Reading: ${filePath}`);

const workbook = xlsx.readFile(filePath);

console.log('--- Sheet Names ---');
for (const sheetName of workbook.SheetNames) {
    console.log(`- ${sheetName}`);

    const worksheet = workbook.Sheets[sheetName];
    // Convert to JSON just to grab the first few rows to inspect headers
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });

    console.log(`  Rows count: ${data.length}`);
    if (data.length > 0) {
        // Find the first row that actually looks like a header (has multiple columns)
        let headerRow = null;
        for (let i = 0; i < Math.min(10, data.length); i++) {
            const row: any = data[i];
            const validCols = row.filter((c: any) => c !== null && c !== '').length;
            if (validCols > 3) {
                headerRow = row;
                console.log(`  Found Headers on line ${i + 1}:`, headerRow.filter((h: any) => h !== null));
                break;
            }
        }
    }
}
