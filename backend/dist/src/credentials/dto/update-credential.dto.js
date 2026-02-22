"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCredentialDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_credential_dto_1 = require("./create-credential.dto");
class UpdateCredentialDto extends (0, mapped_types_1.PartialType)(create_credential_dto_1.CreateCredentialDto) {
}
exports.UpdateCredentialDto = UpdateCredentialDto;
//# sourceMappingURL=update-credential.dto.js.map