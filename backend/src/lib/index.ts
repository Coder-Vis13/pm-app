import dotenv from "dotenv";
dotenv.config();

import { supabase } from "./supabaseClient";

console.log("Supabase URL:", process.env.SUPABASE_URL);