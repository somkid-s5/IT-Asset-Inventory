"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAvatarSeed = createAvatarSeed;
const crypto_1 = require("crypto");
function createAvatarSeed() {
    return (0, crypto_1.randomBytes)(8).toString('hex');
}
//# sourceMappingURL=avatar-seed.js.map