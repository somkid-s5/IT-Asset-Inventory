"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaveVmDraftDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class VmDiskDto {
    label;
    sizeGb;
    datastore;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VmDiskDto.prototype, "label", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], VmDiskDto.prototype, "sizeGb", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VmDiskDto.prototype, "datastore", void 0);
class VmGuestAccountDto {
    username;
    password;
    accessMethod;
    role;
    note;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VmGuestAccountDto.prototype, "username", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VmGuestAccountDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VmGuestAccountDto.prototype, "accessMethod", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VmGuestAccountDto.prototype, "role", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VmGuestAccountDto.prototype, "note", void 0);
class SaveVmDraftDto {
    systemName;
    environment;
    owner;
    businessUnit;
    slaTier;
    serviceRole;
    criticality;
    description;
    notes;
    lifecycleState;
    tags;
    guestAccounts;
    disks;
}
exports.SaveVmDraftDto = SaveVmDraftDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SaveVmDraftDto.prototype, "systemName", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.VmEnvironment),
    __metadata("design:type", String)
], SaveVmDraftDto.prototype, "environment", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SaveVmDraftDto.prototype, "owner", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SaveVmDraftDto.prototype, "businessUnit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SaveVmDraftDto.prototype, "slaTier", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SaveVmDraftDto.prototype, "serviceRole", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.VmCriticality),
    __metadata("design:type", String)
], SaveVmDraftDto.prototype, "criticality", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SaveVmDraftDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SaveVmDraftDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.VmLifecycleState),
    __metadata("design:type", String)
], SaveVmDraftDto.prototype, "lifecycleState", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SaveVmDraftDto.prototype, "tags", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => VmGuestAccountDto),
    __metadata("design:type", Array)
], SaveVmDraftDto.prototype, "guestAccounts", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => VmDiskDto),
    __metadata("design:type", Array)
], SaveVmDraftDto.prototype, "disks", void 0);
//# sourceMappingURL=save-vm-draft.dto.js.map