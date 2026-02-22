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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialsController = void 0;
const common_1 = require("@nestjs/common");
const credentials_service_1 = require("./credentials.service");
const create_credential_dto_1 = require("./dto/create-credential.dto");
const update_credential_dto_1 = require("./dto/update-credential.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
let CredentialsController = class CredentialsController {
    credentialsService;
    constructor(credentialsService) {
        this.credentialsService = credentialsService;
    }
    create(createCredentialDto) {
        return this.credentialsService.create(createCredentialDto);
    }
    findByAsset(assetId) {
        return this.credentialsService.findByAsset(assetId);
    }
    revealPassword(id, req) {
        return this.credentialsService.revealPassword(id, req.user.id);
    }
    update(id, updateCredentialDto) {
        return this.credentialsService.update(id, updateCredentialDto);
    }
    remove(id) {
        return this.credentialsService.remove(id);
    }
};
exports.CredentialsController = CredentialsController;
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'EDITOR'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_credential_dto_1.CreateCredentialDto]),
    __metadata("design:returntype", void 0)
], CredentialsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('asset/:assetId'),
    __param(0, (0, common_1.Param)('assetId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CredentialsController.prototype, "findByAsset", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'EDITOR'),
    (0, common_1.Get)(':id/reveal'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CredentialsController.prototype, "revealPassword", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN', 'EDITOR'),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_credential_dto_1.UpdateCredentialDto]),
    __metadata("design:returntype", void 0)
], CredentialsController.prototype, "update", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CredentialsController.prototype, "remove", null);
exports.CredentialsController = CredentialsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('api/credentials'),
    __metadata("design:paramtypes", [credentials_service_1.CredentialsService])
], CredentialsController);
//# sourceMappingURL=credentials.controller.js.map