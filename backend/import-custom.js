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
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var fileContent, lines, adminUser, importedCount, failedCount, _loop_1, i;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('Starting Custom CSV Import Parse...');
                    fileContent = fs.readFileSync('Book1.csv', 'utf8');
                    lines = fileContent.split('\n');
                    return [4 /*yield*/, prisma.user.findFirst({
                            where: { role: 'ADMIN' }
                        })];
                case 1:
                    adminUser = _a.sent();
                    if (!adminUser) {
                        throw new Error("Admin user not found. Please ensure the database is seeded.");
                    }
                    importedCount = 0;
                    failedCount = 0;
                    _loop_1 = function (i) {
                        var line, row, inQuotes, currentValue, j, char, assetId_1, name_1, typeStr, rack_1, location_1, osVersion_1, ipAddress_1, type_1, error_1;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    line = lines[i].trim();
                                    if (!line)
                                        return [2 /*return*/, "continue"];
                                    row = [];
                                    inQuotes = false;
                                    currentValue = '';
                                    for (j = 0; j < line.length; j++) {
                                        char = line[j];
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
                                    row.push(currentValue.trim()); // push the last value
                                    if (!(row.length >= 2 && row[1] && row[1].length > 1 && !row[1].includes('Asset Name'))) return [3 /*break*/, 4];
                                    assetId_1 = row[0] || null;
                                    name_1 = row[1] || null;
                                    typeStr = row[2] || 'SERVER';
                                    rack_1 = row[3] || null;
                                    location_1 = row[4] || null;
                                    osVersion_1 = row[5] || null;
                                    ipAddress_1 = row[6] || null;
                                    _b.label = 1;
                                case 1:
                                    _b.trys.push([1, 3, , 4]);
                                    type_1 = client_1.AssetType.SERVER;
                                    if (typeStr.toUpperCase().includes('VM'))
                                        type_1 = client_1.AssetType.VM;
                                    if (typeStr.toUpperCase().includes('DB'))
                                        type_1 = client_1.AssetType.DB;
                                    if (typeStr.toUpperCase().includes('APP'))
                                        type_1 = client_1.AssetType.APP;
                                    if (typeStr.toUpperCase().includes('NETWORK'))
                                        type_1 = client_1.AssetType.NETWORK;
                                    console.log("Importing: ".concat(name_1, " (ID: ").concat(assetId_1, ")"));
                                    // Use upsert to avoid duplicate name conflicts just in case
                                    return [4 /*yield*/, prisma.asset.upsert({
                                            where: {
                                                // Because name isn't inherently unique in Prisma right now, 
                                                // and assetId might be missing, we do a findFirst check
                                                id: 'dummy-id-to-force-create'
                                            },
                                            update: {},
                                            create: {
                                                assetId: assetId_1,
                                                name: name_1,
                                                type: type_1,
                                                status: client_1.AssetStatus.ACTIVE,
                                                osVersion: osVersion_1,
                                                location: location_1 ? "".concat(location_1, " ").concat(rack_1 ? "- Rack: ".concat(rack_1) : '') : null,
                                                createdByUserId: adminUser.id,
                                                ipAllocations: ipAddress_1 ? {
                                                    create: [
                                                        { address: ipAddress_1, type: 'Primary' }
                                                    ]
                                                } : undefined,
                                                customMetadata: {
                                                    importedFrom: 'Book1.csv_custom',
                                                    rawLine: line
                                                }
                                            }
                                        }).catch(function () { return __awaiter(_this, void 0, void 0, function () {
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0: 
                                                    // Fallback to normal create
                                                    return [4 /*yield*/, prisma.asset.create({
                                                            data: {
                                                                assetId: assetId_1,
                                                                name: name_1,
                                                                type: type_1,
                                                                status: client_1.AssetStatus.ACTIVE,
                                                                osVersion: osVersion_1,
                                                                location: location_1 ? "".concat(location_1, " ").concat(rack_1 ? "- Rack: ".concat(rack_1) : '') : null,
                                                                createdByUserId: adminUser.id,
                                                                ipAllocations: ipAddress_1 ? {
                                                                    create: [
                                                                        { address: ipAddress_1, type: 'Primary' }
                                                                    ]
                                                                } : undefined,
                                                                customMetadata: {
                                                                    importedFrom: 'Book1.csv_custom',
                                                                    rawLine: line
                                                                }
                                                            }
                                                        })];
                                                    case 1:
                                                        // Fallback to normal create
                                                        _a.sent();
                                                        return [2 /*return*/];
                                                }
                                            });
                                        }); })];
                                case 2:
                                    // Use upsert to avoid duplicate name conflicts just in case
                                    _b.sent();
                                    importedCount++;
                                    return [3 /*break*/, 4];
                                case 3:
                                    error_1 = _b.sent();
                                    console.error("Failed on row: ".concat(name_1));
                                    failedCount++;
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    };
                    i = 2;
                    _a.label = 2;
                case 2:
                    if (!(i < lines.length)) return [3 /*break*/, 5];
                    return [5 /*yield**/, _loop_1(i)];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    i++;
                    return [3 /*break*/, 2];
                case 5:
                    console.log("\nImport Summary:");
                    console.log("Successfully imported: ".concat(importedCount));
                    console.log("Failed (or skipped): ".concat(failedCount));
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
