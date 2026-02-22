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
var crypto = require("crypto");
var prisma = new client_1.PrismaClient();
var algorithm = 'aes-256-gcm';
var secretKey = process.env.ENCRYPTION_KEY || '12345678123456781234567812345678';
function encrypt(text) {
    var iv = crypto.randomBytes(16);
    var cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
    var encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    var authTag = cipher.getAuthTag().toString('hex');
    return "".concat(iv.toString('hex'), ":").concat(encrypted, ":").concat(authTag);
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var ownerUser, filesToImport, totalSuccessCount, _i, filesToImport_1, filePath, fileContent, lines, headerLineIndex, i, rowStr, dataLines, records, count, _a, records_1, rawRecord, record, ipAddress, rackStatus, isStatusActive, assetType, brand, system, name_1, spec, match, parentId, parentAsset, asset, username, password, dbCredentials, assetErr_1, parseErr_1;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    console.log('Starting Extended CSV Migration...');
                    return [4 /*yield*/, prisma.user.findFirst({ where: { role: 'ADMIN' } })];
                case 1:
                    ownerUser = _d.sent();
                    if (!!ownerUser) return [3 /*break*/, 3];
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                email: 'admin@infrapilot.local',
                                passwordHash: 'dummy_hash_for_migration',
                                role: 'ADMIN',
                            }
                        })];
                case 2:
                    ownerUser = _d.sent();
                    console.log('Created default admin user for asset ownership.');
                    _d.label = 3;
                case 3:
                    filesToImport = [
                        '/home/smart/Private/Project/IT-Asset-Inventory/Flie_Password_Update_09-01-69(192.168.60.csv',
                        '/home/smart/Private/Project/IT-Asset-Inventory/backend/prisma/xlsx_export_Land_System.csv',
                        '/home/smart/Private/Project/IT-Asset-Inventory/backend/prisma/xlsx_export____________Auction_.csv',
                        '/home/smart/Private/Project/IT-Asset-Inventory/backend/prisma/xlsx_export_Remote_+Vcenter.csv',
                        '/home/smart/Private/Project/IT-Asset-Inventory/backend/prisma/xlsx_export_NBU.csv'
                    ];
                    totalSuccessCount = 0;
                    _i = 0, filesToImport_1 = filesToImport;
                    _d.label = 4;
                case 4:
                    if (!(_i < filesToImport_1.length)) return [3 /*break*/, 21];
                    filePath = filesToImport_1[_i];
                    if (!fs.existsSync(filePath)) {
                        console.log("Skipping missing file: ".concat(filePath));
                        return [3 /*break*/, 20];
                    }
                    console.log("\nProcessing: ".concat(filePath));
                    fileContent = fs.readFileSync(filePath, 'utf-8');
                    lines = fileContent.split('\n');
                    headerLineIndex = -1;
                    for (i = 0; i < Math.min(15, lines.length); i++) {
                        rowStr = lines[i] || '';
                        // Look for keywords that exist in our required headers
                        if (rowStr.includes('IP Address') && rowStr.includes('Username')) {
                            headerLineIndex = i;
                            break;
                        }
                    }
                    if (headerLineIndex === -1) {
                        console.log("  -> Could not find valid headers. Skipping file.");
                        return [3 /*break*/, 20];
                    }
                    dataLines = lines.slice(headerLineIndex).join('\n');
                    _d.label = 5;
                case 5:
                    _d.trys.push([5, 19, , 20]);
                    records = (0, sync_1.parse)(dataLines, {
                        columns: true,
                        skip_empty_lines: true,
                        trim: true,
                        relax_column_count: true
                    });
                    console.log("  Found ".concat(records.length, " records in this file."));
                    count = 0;
                    _a = 0, records_1 = records;
                    _d.label = 6;
                case 6:
                    if (!(_a < records_1.length)) return [3 /*break*/, 18];
                    rawRecord = records_1[_a];
                    record = rawRecord;
                    ipAddress = record[' IP Address'] || record['IP Address'];
                    if (!ipAddress || ipAddress.toLowerCase() === 'ip ว่าง' || ipAddress === '')
                        return [3 /*break*/, 17];
                    rackStatus = record['Rack'] || '';
                    isStatusActive = false;
                    if (rackStatus && !rackStatus.toLowerCase().includes('free') && !rackStatus.toLowerCase().includes('close')) {
                        isStatusActive = true;
                    }
                    assetType = 'SERVER';
                    brand = ((_b = record['Brand/Model']) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || '';
                    system = ((_c = record['System']) === null || _c === void 0 ? void 0 : _c.toLowerCase()) || '';
                    if (brand.includes('vmware') || system.includes('vm'))
                        assetType = 'VM';
                    if (record['Database Type'] || record['Database Name/SID'])
                        assetType = 'DB';
                    name_1 = record['DisplayName'] || record[' IP Address'] || record['IP Address'];
                    spec = record['Specification'] || '';
                    if (spec.includes('DisplayName :')) {
                        match = spec.match(/DisplayName\s*:\s*([^\n]+)/);
                        if (match)
                            name_1 = match[1].trim();
                    }
                    parentId = undefined;
                    if (!(assetType === 'VM' && system && system !== '')) return [3 /*break*/, 10];
                    return [4 /*yield*/, prisma.asset.findFirst({
                            where: { name: system, type: 'SERVER' }
                        })];
                case 7:
                    parentAsset = _d.sent();
                    if (!!parentAsset) return [3 /*break*/, 9];
                    return [4 /*yield*/, prisma.asset.create({
                            data: {
                                name: system,
                                type: 'SERVER',
                                status: 'ACTIVE',
                                department: rackStatus || 'IT',
                                createdByUserId: ownerUser.id,
                            }
                        })];
                case 8:
                    parentAsset = _d.sent();
                    _d.label = 9;
                case 9:
                    parentId = parentAsset.id;
                    _d.label = 10;
                case 10:
                    _d.trys.push([10, 16, , 17]);
                    return [4 /*yield*/, prisma.asset.create({
                            data: {
                                name: name_1,
                                type: assetType,
                                osVersion: record['Operating System'] || 'Unknown OS',
                                status: isStatusActive ? 'ACTIVE' : 'MAINTENANCE',
                                department: rackStatus || 'IT',
                                createdByUserId: ownerUser.id,
                                parentId: parentId,
                                ipAllocations: {
                                    create: [{ address: ipAddress, type: 'Management/Primary' }]
                                }
                            }
                        })];
                case 11:
                    asset = _d.sent();
                    username = record['Username'];
                    password = record['Password'];
                    if (!(username && password && password !== '-' && password !== 'ไม่มี')) return [3 /*break*/, 13];
                    return [4 /*yield*/, prisma.credential.create({
                            data: {
                                assetId: asset.id,
                                username: username,
                                encryptedPassword: encrypt(password),
                                lastChangedDate: new Date(),
                            }
                        })];
                case 12:
                    _d.sent();
                    _d.label = 13;
                case 13:
                    dbCredentials = record['U & P Database'] || record['U & P to Connect Database'];
                    if (!(dbCredentials && dbCredentials !== '-')) return [3 /*break*/, 15];
                    return [4 /*yield*/, prisma.credential.create({
                            data: {
                                assetId: asset.id,
                                username: 'db_admin',
                                encryptedPassword: encrypt(dbCredentials),
                                lastChangedDate: new Date(),
                            }
                        })];
                case 14:
                    _d.sent();
                    _d.label = 15;
                case 15:
                    count++;
                    return [3 /*break*/, 17];
                case 16:
                    assetErr_1 = _d.sent();
                    console.error("    Failed to migrate IP ".concat(ipAddress, ":"), assetErr_1.message);
                    return [3 /*break*/, 17];
                case 17:
                    _a++;
                    return [3 /*break*/, 6];
                case 18:
                    console.log("  -> Successfully imported ".concat(count, " assets from this file."));
                    totalSuccessCount += count;
                    return [3 /*break*/, 20];
                case 19:
                    parseErr_1 = _d.sent();
                    console.error("  -> Failed to parse CSV data:", parseErr_1.message);
                    return [3 /*break*/, 20];
                case 20:
                    _i++;
                    return [3 /*break*/, 4];
                case 21:
                    console.log("\nExtended Migration complete! Successfully imported a total of ".concat(totalSuccessCount, " additional assets."));
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
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
