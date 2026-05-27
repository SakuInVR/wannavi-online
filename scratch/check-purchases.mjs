import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Read and parse .env
const envPath = path.join(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : "";
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value;
  }
});

const supabaseUrl = env["NEXT_PUBLIC_SUPABASE_URL"];
const supabaseServiceKey = env["SUPABASE_SERVICE_ROLE_KEY"];

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase configuration in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log("--- Checking Purchases Table ---");
  const { data: purchases, error: purchaseError } = await supabase
    .from("purchases")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (purchaseError) {
    console.error("Error fetching purchases:", purchaseError);
  } else {
    console.log(purchases);
  }

  console.log("\n--- Checking Recent Profile Updates ---");
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, credits, updated_at")
    .order("updated_at", { ascending: false })
    .limit(5);

  if (profileError) {
    console.error("Error fetching profiles:", profileError);
  } else {
    console.log(profiles);
  }
}

run();
