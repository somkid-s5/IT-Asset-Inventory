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
exports.VmController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const save_vm_draft_dto_1 = require("./dto/save-vm-draft.dto");
const save_vm_source_dto_1 = require("./dto/save-vm-source.dto");
const test_vm_source_connection_dto_1 = require("./dto/test-vm-source-connection.dto");
const vm_service_1 = require("./vm.service");
let VmController = class VmController {
    vmService;
    constructor(vmService) {
        this.vmService = vmService;
    }
    findSources() {
        return this.vmService.findSources();
    }
    createSource(dto, req) {
        return this.vmService.createSource(dto, req.user.id);
    }
    updateSource(id, dto) {
        return this.vmService.updateSource(id, dto);
    }
    removeSource(id) {
        return this.vmService.removeSource(id);
    }
    syncAllSources() {
        return this.vmService.syncAllSources();
    }
    testSourceConnection(dto) {
        return this.vmService.testSourceConnection(dto);
    }
    syncSource(id) {
        return this.vmService.syncSource(id);
    }
    findDiscoveries() {
        return this.vmService.findDiscoveries();
    }
    findDiscovery(id) {
        return this.vmService.findDiscovery(id);
    }
    updateDiscovery(id, dto, req) {
        return this.vmService.updateDiscovery(id, dto, req.user.id);
    }
    promoteDiscovery(id, dto, req) {
        return this.vmService.promoteDiscovery(id, dto, req.user.id);
    }
    archiveDiscovery(id) {
        return this.vmService.archiveDiscovery(id);
    }
    findInventory() {
        return this.vmService.findInventory();
    }
    findInventoryById(id) {
        return this.vmService.findInventoryById(id);
    }
    updateInventory(id, dto, req) {
        return this.vmService.updateInventory(id, dto, req.user.id);
    }
    archiveInventory(id, lifecycleState) {
        return this.vmService.archiveInventory(id, lifecycleState);
    }
};
exports.VmController = VmController;
__decorate([
    (0, common_1.Get)('sources'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], VmController.prototype, "findSources", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EDITOR),
    (0, common_1.Post)('sources'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [save_vm_source_dto_1.SaveVmSourceDto, Object]),
    __metadata("design:returntype", void 0)
], VmController.prototype, "createSource", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EDITOR),
    (0, common_1.Patch)('sources/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, save_vm_source_dto_1.SaveVmSourceDto]),
    __metadata("design:returntype", void 0)
], VmController.prototype, "updateSource", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EDITOR),
    (0, common_1.Delete)('sources/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VmController.prototype, "removeSource", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EDITOR),
    (0, common_1.Post)('sources/sync-all'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], VmController.prototype, "syncAllSources", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EDITOR),
    (0, common_1.Post)('sources/test-connection'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [test_vm_source_connection_dto_1.TestVmSourceConnectionDto]),
    __metadata("design:returntype", void 0)
], VmController.prototype, "testSourceConnection", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EDITOR),
    (0, common_1.Post)('sources/:id/sync'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VmController.prototype, "syncSource", null);
__decorate([
    (0, common_1.Get)('discoveries'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], VmController.prototype, "findDiscoveries", null);
__decorate([
    (0, common_1.Get)('discoveries/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VmController.prototype, "findDiscovery", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EDITOR),
    (0, common_1.Patch)('discoveries/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, save_vm_draft_dto_1.SaveVmDraftDto, Object]),
    __metadata("design:returntype", void 0)
], VmController.prototype, "updateDiscovery", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EDITOR),
    (0, common_1.Post)('discoveries/:id/promote'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, save_vm_draft_dto_1.SaveVmDraftDto, Object]),
    __metadata("design:returntype", void 0)
], VmController.prototype, "promoteDiscovery", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EDITOR),
    (0, common_1.Post)('discoveries/:id/archive'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VmController.prototype, "archiveDiscovery", null);
__decorate([
    (0, common_1.Get)('inventory'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], VmController.prototype, "findInventory", null);
__decorate([
    (0, common_1.Get)('inventory/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VmController.prototype, "findInventoryById", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EDITOR),
    (0, common_1.Patch)('inventory/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, save_vm_draft_dto_1.SaveVmDraftDto, Object]),
    __metadata("design:returntype", void 0)
], VmController.prototype, "updateInventory", null);
__decorate([
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN, client_1.Role.EDITOR),
    (0, common_1.Post)('inventory/:id/archive'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('lifecycleState')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], VmController.prototype, "archiveInventory", null);
exports.VmController = VmController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('api/vm'),
    __metadata("design:paramtypes", [vm_service_1.VmService])
], VmController);
//# sourceMappingURL=vm.controller.js.map