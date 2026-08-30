"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const supabaseClient_1 = require("./supabaseClient");
async function test() {
    const { data, error } = await supabaseClient_1.supabase
        .from("app_user")
        .select("*")
        .limit(1);
    console.log("DATA:", data);
    console.log("ERROR:", error);
}
test();
