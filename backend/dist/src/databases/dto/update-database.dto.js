"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateDatabaseDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_database_dto_1 = require("./create-database.dto");
class UpdateDatabaseDto extends (0, mapped_types_1.PartialType)(create_database_dto_1.CreateDatabaseDto) {
}
exports.UpdateDatabaseDto = UpdateDatabaseDto;
//# sourceMappingURL=update-database.dto.js.map