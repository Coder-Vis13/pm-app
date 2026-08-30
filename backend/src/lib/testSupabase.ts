import dotenv from "dotenv";
dotenv.config();

import { supabase } from "./supabaseClient";

async function test() {
  const { data, error } = await supabase
    .from("app_user")
    .select("*")
    .limit(1);

  console.log("DATA:", data);
  console.log("ERROR:", error);
}

test();