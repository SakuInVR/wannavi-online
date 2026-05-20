import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const articleStatesPath = path.join(root, "content", "article-states.json");
const states = [
  "idea",
  "researched",
  "drafted",
  "reviewed",
  "monetized",
  "ready",
  "published",
  "verified",
  "improving",
];

if (!fs.existsSync(articleStatesPath)) {
  console.error("content/article-states.json does not exist. Run npm run pipeline:sync first.");
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(articleStatesPath, "utf8"));
const rows = payload.states ?? [];
const counts = Object.fromEntries(states.map((state) => [state, 0]));

for (const row of rows) {
  counts[row.pipelineState] = (counts[row.pipelineState] ?? 0) + 1;
}

console.log("Wannavi pipeline state report");
console.log("=============================");
console.log(`Generated at: ${payload.generatedAt ?? "unknown"}`);
console.log("");
console.log("State counts");
for (const state of states) {
  console.log(`- ${state}: ${counts[state]}`);
}
console.log("");

for (const state of states) {
  const stateRows = rows.filter((row) => row.pipelineState === state);
  if (stateRows.length === 0) {
    continue;
  }

  console.log(state);
  console.log("-".repeat(state.length));
  for (const row of stateRows) {
    console.log(`- ${row.slug} [${row.category}/${row.affiliateIntent}] ${row.title}`);
    const reason = row.blockers?.[0] ?? row.warnings?.[0] ?? "No blocker.";
    const next = row.nextActions?.[0] ?? "No next action recorded.";
    console.log(`  reason: ${reason}`);
    console.log(`  next: ${next}`);
  }
  console.log("");
}
