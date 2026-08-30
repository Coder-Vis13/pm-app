"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskHistoryEntry = taskHistoryEntry;
exports.verifyAuditChain = verifyAuditChain;
exports.listAuditLog = listAuditLog;
const crypto_1 = require("crypto");
const supabaseClient_1 = require("../lib/supabaseClient");
const errors_1 = require("../lib/errors");
const GENESIS_HASH = "0".repeat(64);
//SHA-256 hashing
function computeHash(prevHash, historyId, snapshot, createdAt) {
    const payload = `${prevHash}|${historyId}|${JSON.stringify(snapshot)}|${createdAt}`;
    return (0, crypto_1.createHash)("sha256").update(payload).digest("hex");
}
//Return the current hash of the latest audit log entry (the chain tip), or the genesis hash if the audit log is empty
async function getLastAuditHash() {
    const { data, error } = await supabaseClient_1.supabase
        .from("cryptographic_audit_log")
        .select("curr_hash")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return data?.curr_hash ?? GENESIS_HASH;
}
//Append a hash-chain entry for the latest task_history row (if not already sealed)
async function taskHistoryEntry(taskId) {
    const { data: history, error: histError } = await supabaseClient_1.supabase
        .from("task_history")
        .select("id, task_snapshot, created_at")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    if (histError)
        throw new errors_1.AppError(histError.message, 500);
    if (!history)
        return;
    const { data: existing } = await supabaseClient_1.supabase
        .from("cryptographic_audit_log")
        .select("id")
        .eq("task_history_id", history.id)
        .maybeSingle();
    if (existing)
        return;
    const prevHash = await getLastAuditHash();
    const currHash = computeHash(prevHash, history.id, history.task_snapshot, history.created_at);
    const { error } = await supabaseClient_1.supabase.from("cryptographic_audit_log").insert({
        id: (0, crypto_1.randomUUID)(),
        task_history_id: history.id,
        prev_hash: prevHash,
        curr_hash: currHash,
        created_at: new Date().toISOString(),
    });
    if (error)
        throw new errors_1.AppError(error.message, 500);
}
//Verify each link in the audit chain to check if its broken and that the task history hasn't been altered
async function verifyAuditChain() {
    const { data: entries, error } = await supabaseClient_1.supabase
        .from("cryptographic_audit_log")
        .select("id, task_history_id, prev_hash, curr_hash, created_at, task_history(task_snapshot, created_at)")
        .order("created_at", { ascending: true });
    if (error)
        throw new errors_1.AppError(error.message, 500);
    if (!entries?.length)
        return { valid: true, checked: 0 };
    //start from genesis hash
    let expectedPrev = GENESIS_HASH;
    for (const entry of entries) {
        if (entry.prev_hash !== expectedPrev) {
            return { valid: false, checked: entries.indexOf(entry), brokenAt: entry.id };
        }
        const history = entry.task_history;
        const expectedCurr = computeHash(entry.prev_hash, entry.task_history_id, history.task_snapshot, history.created_at);
        if (entry.curr_hash !== expectedCurr) {
            return { valid: false, checked: entries.indexOf(entry), brokenAt: entry.id };
        }
        expectedPrev = entry.curr_hash;
    }
    return { valid: true, checked: entries.length };
}
async function listAuditLog(limit = 50) {
    const { data, error } = await supabaseClient_1.supabase
        .from("cryptographic_audit_log")
        .select("id, task_history_id, prev_hash, curr_hash, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
    if (error)
        throw new errors_1.AppError(error.message, 500);
    return data ?? [];
}
