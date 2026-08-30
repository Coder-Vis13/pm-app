"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireUser = requireUser;
const supabaseClient_1 = require("../lib/supabaseClient");
const errors_1 = require("../lib/errors");
/** Temporary auth: pass the acting user's UUID in X-User-Id until Supabase Auth is wired. */
async function requireUser(req, res, next) {
    try {
        const userId = req.header("X-User-Id");
        if (!userId) {
            throw new errors_1.AppError("Missing X-User-Id header", 401);
        }
        const { data, error } = await supabaseClient_1.supabase
            .from("app_user")
            .select("id")
            .eq("id", userId)
            .maybeSingle();
        if (error)
            throw new errors_1.AppError(error.message, 500);
        if (!data)
            throw new errors_1.AppError("User not found", 401);
        req.userId = userId;
        next();
    }
    catch (err) {
        next(err);
    }
}
