"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PASSWORD_POLICY_MESSAGE = exports.PASSWORD_POLICY_REGEX = void 0;
exports.PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/;
exports.PASSWORD_POLICY_MESSAGE = 'Password must be at least 12 characters and include uppercase, lowercase, a number, and a special character';
//# sourceMappingURL=password-policy.js.map