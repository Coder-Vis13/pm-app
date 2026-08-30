"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const taskService_1 = require("../services/taskService");
const projectId = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const validSectionId = "d1111111-1111-1111-1111-111111111111";
const invalidSectionId = "d4444444-4444-4444-4444-444444444444";
const validUser = "11111111-1111-1111-1111-111111111111";
async function testTaskRules() {
    console.log("\n=== TEST 3: VALID TASK CREATION ===");
    try {
        const task = await (0, taskService_1.createTask)({
            title: "Task OK",
            projectId,
            sectionId: validSectionId,
            userId: validUser,
        });
        console.log("PASS ✅ task created:", task.id);
    }
    catch (e) {
        console.error("FAIL ❌ should not fail:", e.message);
    }
    console.log("\n=== TEST 4: INVALID SECTION MUST FAIL ===");
    try {
        await (0, taskService_1.createTask)({
            title: "Task FAIL",
            projectId,
            sectionId: invalidSectionId,
            userId: validUser,
        });
        console.error("FAIL ❌ should have thrown error");
    }
    catch (e) {
        console.log("PASS ✅ blocked correctly:", e.message);
    }
}
testTaskRules();
