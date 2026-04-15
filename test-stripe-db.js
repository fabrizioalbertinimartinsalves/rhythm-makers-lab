import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking integrations table for stripe...");
  const { data, error } = await supabase
    .from("integrations")
    .select("studio_id, provider, config, ativa")
    .eq("provider", "stripe");
    
  if (error) {
    console.error("Error fetching integrations:", error.message);
  } else {
    for (const row of data || []) {
       console.log("Studio ID:", row.studio_id);
       console.log("Active:", row.ativa);
       console.log("Has publishable key:", !!row.config?.publishable_key);
       console.log("Has secret key:", !!row.config?.secret_key);
       console.log("---");
    }
    if (data?.length === 0) {
      console.log("No Stripe integrations found!");
    }
  }
}

check();
