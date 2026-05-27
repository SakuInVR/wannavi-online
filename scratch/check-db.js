const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing env variables NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  console.log("--- Profiles in DB ---");
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('*');

  if (pErr) console.error("Profiles error:", pErr);
  else console.log(JSON.stringify(profiles, null, 2));

  console.log("\n--- Articles in DB with user_id ---");
  const { data: articles, error: artErr } = await supabase
    .from('articles')
    .select('id, title, slug, user_id, review_status, pipeline_state')
    .not('user_id', 'is', null);

  if (artErr) console.error("Articles error:", artErr);
  else console.log(JSON.stringify(articles, null, 2));
}

check();
