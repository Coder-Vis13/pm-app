"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const taskService_1 = require("../services/taskService");
const dependencyService_1 = require("../services/dependencyService");
const taskAccessService_1 = require("../services/taskAccessService");
const membershipService_1 = require("../services/membershipService");
// FIXED IDS FROM YOUR DB
const workspaceId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const projectId = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const sectionId = "d1111111-1111-1111-1111-111111111111";
const user1 = "11111111-1111-1111-1111-111111111111";
const user2 = "33333333-3333-3333-3333-333333333333";
const fakeUser = "99999999-9999-9999-9999-999999999999";
async function run() {
    console.log("\n--- TEST 1: TASK ACCESS CONTROL ---");
    try {
        await (0, taskAccessService_1.validateTaskAccess)(user1, "e1111111-1111-1111-1111-111111111111");
        console.log("PASS access ok");
    }
    catch (e) {
        console.log("FAIL", e.message);
    }
    console.log("\n--- TEST 2: BLOCK FAKE USER ACCESS ---");
    try {
        await (0, taskAccessService_1.validateTaskAccess)(fakeUser, "e1111111-1111-1111-1111-111111111111");
        console.log("FAIL should not allow");
    }
    catch (e) {
        console.log("PASS blocked:", e.message);
    }
    console.log("\n--- TEST 3: CREATE TASK VALID ---");
    const task = await (0, taskService_1.createTask)({
        title: "Cycle Test Task",
        projectId,
        sectionId,
        userId: user1,
    });
    console.log("TASK CREATED", task.id);
    console.log("\n--- TEST 4: DEPENDENCY VALIDATION ---");
    try {
        await (0, dependencyService_1.canCreateDependency)(task.id, task.id);
        console.log("FAIL self dependency allowed");
    }
    catch (e) {
        console.log("PASS self dependency blocked:", e.message);
    }
    console.log("\n--- TEST 5: REMOVE USER FROM PROJECT ---");
    await (0, membershipService_1.removeUserFromProject)(user2, projectId);
    console.log("User removed + assignees cleaned (check DB)");
}
run();
