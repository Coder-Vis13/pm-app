"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
console.log(process.env.SUPABASE_URL);
console.log(process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20));
const app_1 = require("./app");
const PORT = process.env.PORT ?? 3001;
const app = (0, app_1.createApp)();
app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
});
