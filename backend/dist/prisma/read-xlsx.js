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
const filePath = '/home/smart/Private/Project/IT-Asset-Inventory/Flie_Password_Update_09-01-69.xlsx';
console.log(`Reading: ${filePath}`);
const workbook = xlsx.readFile(filePath);
console.log('--- Sheet Names ---');
for (const sheetName of workbook.SheetNames) {
    console.log(`- ${sheetName}`);
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });
    console.log(`  Rows count: ${data.length}`);
    if (data.length > 0) {
        let headerRow = null;
        for (let i = 0; i < Math.min(10, data.length); i++) {
            const row = data[i];
            const validCols = row.filter((c) => c !== null && c !== '').length;
            if (validCols > 3) {
                headerRow = row;
                console.log(`  Found Headers on line ${i + 1}:`, headerRow.filter((h) => h !== null));
                break;
            }
        }
    }
}
//# sourceMappingURL=read-xlsx.js.map