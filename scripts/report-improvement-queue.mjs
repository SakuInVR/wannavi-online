import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const tasksPath = path.join(root, "content", "improvement-tasks.json");

if (!fs.existsSync(tasksPath)) {
  console.error("content/improvement-tasks.json does not exist. Run npm run improvements:sync first.");
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(tasksPath, "utf8"));
const tasks = (payload.tasks ?? [])
  .filter((task) => task.status === "open" || task.status === "in_progress")
  .sort((a, b) => b.priority - a.priority || a.articleSlug.localeCompare(b.articleSlug));

console.log("Wannavi improvement queue");
console.log("=========================");
console.log(`Generated at: ${payload.generatedAt ?? "unknown"}`);
console.log("");

if (tasks.length === 0) {
  console.log("No open improvement tasks found.");
  process.exit(0);
}

for (const [index, task] of tasks.entries()) {
  console.log(`${index + 1}. [P${task.priority}] ${task.articleSlug}`);
  console.log(`   title: ${task.articleTitle}`);
  console.log(`   type: ${task.type}`);
  console.log(`   reason: ${task.reason}`);
  console.log(`   action: ${task.action}`);
  console.log(`   evidence: ${task.evidenceTarget}`);
  console.log("");
}
