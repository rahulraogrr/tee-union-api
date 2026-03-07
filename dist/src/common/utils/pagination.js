"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_PAGE_LIMIT = void 0;
exports.clampLimit = clampLimit;
exports.MAX_PAGE_LIMIT = 100;
function clampLimit(requested, defaultLimit = 20) {
    const value = requested ?? defaultLimit;
    return Math.min(Math.max(1, value), exports.MAX_PAGE_LIMIT);
}
//# sourceMappingURL=pagination.js.map