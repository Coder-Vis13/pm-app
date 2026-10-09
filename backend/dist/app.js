"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = require("./middleware/auth");
const errorHandler_1 = require("./middleware/errorHandler");
const projects_1 = __importDefault(require("./routes/projects"));
const sections_1 = __importDefault(require("./routes/sections"));
const tasks_1 = __importDefault(require("./routes/tasks"));
const workspaces_1 = __importDefault(require("./routes/workspaces"));
const dependencies_1 = __importDefault(require("./routes/dependencies"));
const history_1 = __importDefault(require("./routes/history"));
const metrics_1 = __importDefault(require("./routes/metrics"));
const insights_1 = __importDefault(require("./routes/insights"));
function createApp() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.get("/health", (_req, res) => {
        res.json({ ok: true });
    });
    app.use(auth_1.requireUser);
    app.use("/api/workspaces", workspaces_1.default);
    app.use("/api/projects", projects_1.default);
    app.use("/api/projects/:projectId/sections", sections_1.default);
    app.use("/api/tasks", tasks_1.default);
    app.use("/api/dependencies", dependencies_1.default);
    app.use("/api/history", history_1.default);
    app.use("/api/metrics", metrics_1.default);
    app.use("/api/insights", insights_1.default);
    app.use(errorHandler_1.errorHandler);
    return app;
}
