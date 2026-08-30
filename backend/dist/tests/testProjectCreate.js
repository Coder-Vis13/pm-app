"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const projectService_1 = require("../services/projectService");
// replace with real values from your DB
const workspaceId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
// valid member
const validUser = "11111111-1111-1111-1111-111111111111";
// invalid user (NOT in workspace)
const invalidUser = "99999999-9999-9999-9999-999999999999";
async function runTests() {
    console.log("TEST 1: valid project creation");
    try {
        const project = await (0, projectService_1.createProject)({
            name: "Valid Project",
            workspaceId,
            userId: validUser,
        });
        console.log("PASS ✅ project created:", project.id);
    }
    catch (e) {
        console.error("FAIL ❌ should not fail:", e.message);
    }
    console.log("\nTEST 2: invalid user should fail");
    try {
        await (0, projectService_1.createProject)({
            name: "Invalid Project",
            workspaceId,
            userId: invalidUser,
        });
        console.error("FAIL ❌ should have thrown error");
    }
    catch (e) {
        console.log("PASS ✅ blocked correctly:", e.message);
    }
}
runTests();
