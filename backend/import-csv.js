"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var fs = require("fs");
var sync_1 = require("csv-parse/sync");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var fileContent, records, adminUser, importedCount, failedCount, _i, records_1, record, assetId, name_1, osVersion, ipAddress, asset, error_1;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        return __generator(this, function (_o) {
            switch (_o.label) {
                case 0:
                    console.log('Starting CSV Import...');
                    fileContent = fs.readFileSync('../Book1.csv');
                    records = (0, sync_1.parse)(fileContent, {
                        columns: true,
                        skip_empty_lines: true,
                        bom: true // Handle potential Byte Order Mark
                    });
                    console.log("Found ".concat(records.length, " records in the CSV."));
                    return [4 /*yield*/, prisma.user.findFirst({
                            where: { role: 'ADMIN' }
                        })];
                case 1:
                    adminUser = _o.sent();
                    if (!adminUser) {
                        throw new Error("Admin user not found. Please ensure the database is seeded.");
                    }
                    importedCount = 0;
                    failedCount = 0;
                    _i = 0, records_1 = records;
                    _o.label = 2;
                case 2:
                    if (!(_i < records_1.length)) return [3 /*break*/, 7];
                    record = records_1[_i];
                    _o.label = 3;
                case 3:
                    _o.trys.push([3, 5, , 6]);
                    assetId = ((_a = record['"Asset ID\n(รหัส□□"']) === null || _a === void 0 ? void 0 : _a.trim()) || ((_b = record['Asset ID']) === null || _b === void 0 ? void 0 : _b.trim()) || ((_c = record[Object.keys(record)[0]]) === null || _c === void 0 ? void 0 : _c.trim());
                    name_1 = ((_d = record['"Asset Name\n(ชื่"']) === null || _d === void 0 ? void 0 : _d.trim()) || ((_e = record['Asset Name']) === null || _e === void 0 ? void 0 : _e.trim()) || ((_f = record[Object.keys(record)[1]]) === null || _f === void 0 ? void 0 : _f.trim());
                    osVersion = ((_g = record['"OS Version\n(ระบบป"']) === null || _g === void 0 ? void 0 : _g.trim()) || ((_h = record['OS Version']) === null || _h === void 0 ? void 0 : _h.trim()) || ((_j = record[Object.keys(record)[5]]) === null || _j === void 0 ? void 0 : _j.trim());
                    ipAddress = ((_k = record['"IP Address\n(ไอพี"']) === null || _k === void 0 ? void 0 : _k.trim()) || ((_l = record['IP Address']) === null || _l === void 0 ? void 0 : _l.trim()) || ((_m = record[Object.keys(record)[6]]) === null || _m === void 0 ? void 0 : _m.trim());
                    if (!name_1) {
                        console.log("Skipping record without name...");
                        return [3 /*break*/, 6];
                    }
                    console.log("Importing: ".concat(name_1, " (ID: ").concat(assetId, ")"));
                    return [4 /*yield*/, prisma.asset.create({
                            data: {
                                assetId: assetId || undefined,
                                name: name_1,
                                type: client_1.AssetType.SERVER, // Defaulting to SERVER for now, can be adjusted
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
                                    originalRecord: record // Storing full original record just in case
                                }
                            }
                        })];
                case 4:
                    asset = _o.sent();
                    importedCount++;
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _o.sent();
                    console.error("Failed to import record:", record.name);
                    console.error(error_1);
                    failedCount++;
                    return [3 /*break*/, 6];
                case 6:
                    _i++;
                    return [3 /*break*/, 2];
                case 7:
                    console.log("\nImport Summary:");
                    console.log("Successfully imported: ".concat(importedCount));
                    console.log("Failed: ".concat(failedCount));
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error("Import failed:", e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
