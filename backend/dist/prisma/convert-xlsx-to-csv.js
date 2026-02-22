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
const xlsx = __importStar(require("xlsx"));
const fs = __importStar(require("fs"));
const filePath = '/home/smart/Private/Project/IT-Asset-Inventory/Flie_Password_Update_09-01-69.xlsx';
const workbook = xlsx.readFile(filePath);
const targetSheets = ['Land_System', 'ระบบประมูล(Auction)', 'Remote +Vcenter', 'NBU'];
for (const sheetName of targetSheets) {
    if (!workbook.SheetNames.includes(sheetName))
        continue;
    console.log(`Extracting data from sheet: ${sheetName}`);
    const worksheet = workbook.Sheets[sheetName];
    const csvContent = xlsx.utils.sheet_to_csv(worksheet, { blankrows: false });
    const safeName = sheetName.replace(/[^a-zA-Z0-9_\-\+]/g, '_');
    const outPath = `/home/smart/Private/Project/IT-Asset-Inventory/backend/prisma/xlsx_export_${safeName}.csv`;
    fs.writeFileSync(outPath, csvContent, 'utf-8');
    console.log(`Saved: ${outPath}`);
}
//# sourceMappingURL=convert-xlsx-to-csv.js.map