import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const tasksPath = path.join(root, "content", "improvement-tasks.json");
const articleStatesPath = path.join(root, "content", "article-states.json");

const allowedStatuses = new Set(["open", "in_progress", "blocked", "done", "closed"]);
const allowedTypes = new Set([
  "affiliate-product",
  "ad-creative",
  "editorial-voice",
  "seo-intro",
  "decision-asset",
  "depth",
  "deployment",
  "analytics",
]);

function fail(message) {
  console.error(`- ${message}`);
  return 1;
}

if (!fs.existsSync(tasksPath)) {
  console.error("content/improvement-tasks.json does not exist. Run npm run improvements:sync first.");
  process.exit(1);
}

if (!fs.existsSync(articleStatesPath)) {
  console.error("content/article-states.json does not exist. Run npm run pipeline:sync first.");
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(tasksPath, "utf8"));
const articleStates = JSON.parse(fs.readFileSync(articleStatesPath, "utf8"));
const articleSlugs = new Set(articleStates.states.map((state) => state.slug));

let failures = 0;

if (payload.version !== 1) {
  failures += fail("improvement-tasks.json version must be 1");
}

if (!Array.isArray(payload.tasks)) {
  failures += fail("improvement-tasks.json tasks must be an array");
} else {
  const ids = new Set();

  for (const [index, task] of payload.tasks.entries()) {
    const label = `tasks[${index}]`;

    if (!task.id || typeof task.id !== "string") {
      failures += fail(`${label}: missing id`);
    } else if (ids.has(task.id)) {
      failures += fail(`${label}: duplicate id "${task.id}"`);
    } else {
      ids.add(task.id);
    }

    const isOperationalTask = task.category === "operations";
    if (!isOperationalTask && !articleSlugs.has(task.articleSlug)) {
      failures += fail(`${label}: unknown articleSlug "${task.articleSlug}"`);
    }

    if (!allowedStatuses.has(task.status)) {
      failures += fail(`${label}: invalid status "${task.status}"`);
    }

    if (!allowedTypes.has(task.type)) {
      failures += fail(`${label}: invalid type "${task.type}"`);
    }

    if (!Number.isInteger(task.priority) || task.priority < 0 || task.priority > 100) {
      failures += fail(`${label}: priority must be an integer from 0 to 100`);
    }

    for (const field of ["reason", "action", "evidenceTarget"]) {
      if (!task[field] || typeof task[field] !== "string") {
        failures += fail(`${label}: missing ${field}`);
      }
    }
  }
}

if (failures > 0) {
  console.error(`Improvement task validation failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log(`Improvement task validation passed for ${payload.tasks.length} task(s).`);
