"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const errors_1 = require("../lib/errors");
function errorHandler(err, _req, res, _next) {
    if (err instanceof errors_1.AppError) {
        return res.status(err.statusCode).json({ error: err.message });
    }
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
}
