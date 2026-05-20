import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationPath = path.join(
  root,
  "supabase",
  "migrations",
  "202605200001_affiliate_automation_control_plane.sql",
);

const requiredTables = [
  "topics",
  "articles",
  "research_sources",
  "source_analyses",
  "article_claims",
  "buyer_decisions",
  "ai_runs",
  "quality_reviews",
  "affiliate_programs",
  "affiliate_program_snapshots",
  "asp_opportunities",
  "ad_creatives",
  "article_ad_slots",
  "publish_jobs",
  "deployment_checks",
  "improvement_tasks",
];

const requiredTypes = [
  "article_pipeline_state",
  "affiliate_program_status",
  "publish_job_status",
];

function fail(message) {
  console.error(`- ${message}`);
  return 1;
}

if (!fs.existsSync(migrationPath)) {
  console.error(`Missing Supabase migration: ${path.relative(root, migrationPath)}`);
  process.exit(1);
}

const sql = fs.readFileSync(migrationPath, "utf8");
let failures = 0;

for (const type of requiredTypes) {
  if (!sql.includes(`create type public.${type}`)) {
    failures += fail(`missing enum type ${type}`);
  }
}

for (const table of requiredTables) {
  if (!sql.includes(`create table public.${table}`)) {
    failures += fail(`missing table ${table}`);
  }
}

for (const state of [
  "idea",
  "researched",
  "drafted",
  "reviewed",
  "monetized",
  "ready",
  "published",
  "verified",
  "improving",
]) {
  if (!sql.includes(`'${state}'`)) {
    failures += fail(`missing pipeline state ${state}`);
  }
}

for (const status of ["queued", "deploying", "succeeded", "failed", "rate_limited"]) {
  if (!sql.includes(`'${status}'`)) {
    failures += fail(`missing publish job status ${status}`);
  }
}

if (failures > 0) {
  console.error(`Supabase schema validation failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log("Supabase schema validation passed.");
