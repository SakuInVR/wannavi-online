import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or key env variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, count, error } = await supabase
    .from("articles")
    .select("slug, title, pipeline_state, tags", { count: "exact" });

  if (error) {
    console.error("Error fetching articles:", error);
    process.exit(1);
  }

  console.log(`Total articles in DB: ${count}`);
  console.log("Articles sample in DB:", data?.slice(0, 5));
}

run();
