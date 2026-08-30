"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.assertFound = assertFound;
class AppError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
        this.name = "AppError";
    }
}
exports.AppError = AppError;
function assertFound(value, label) {
    if (value == null) {
        throw new AppError(`${label} not found`, 404);
    }
    return value;
}
