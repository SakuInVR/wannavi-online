import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const snapshotsPath = path.join(root, "content", "affiliate-program-snapshots.json");
const adCreativesPath = path.join(root, "content", "ad-creatives.json");
const articlesDirectory = path.join(root, "content", "articles");

const statuses = new Set([
  "candidate",
  "applied",
  "approved",
  "rejected",
  "expired",
]);
const asps = new Set(["a8", "moshimo", "valuecommerce", "other"]);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function fail(message) {
  console.error(`- ${message}`);
  return 1;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

if (!fs.existsSync(snapshotsPath)) {
  console.error("content/affiliate-program-snapshots.json does not exist");
  process.exit(1);
}

const snapshots = readJson(snapshotsPath);
const creatives = fs.existsSync(adCreativesPath) ? readJson(adCreativesPath) : [];
const creativeIds = new Set(creatives.map((creative) => creative.id));
const articleSlugs = new Set(
  fs
    .readdirSync(articlesDirectory)
    .filter((filename) => filename.endsWith(".mdx"))
    .map((filename) => filename.replace(/\.mdx$/, "")),
);

let failures = 0;
const ids = new Set();

if (!Array.isArray(snapshots)) {
  console.error("content/affiliate-program-snapshots.json must be an array");
  process.exit(1);
}

for (const [index, snapshot] of snapshots.entries()) {
  const label = `snapshot[${index}]`;

  if (!snapshot.id || typeof snapshot.id !== "string") {
    failures += fail(`${label}: missing id`);
  } else if (ids.has(snapshot.id)) {
    failures += fail(`${label}: duplicate id "${snapshot.id}"`);
  } else {
    ids.add(snapshot.id);
  }

  if (!asps.has(snapshot.asp)) {
    failures += fail(`${label}: asp must be a8, moshimo, valuecommerce, or other`);
  }

  if (!snapshot.programName || typeof snapshot.programName !== "string") {
    failures += fail(`${label}: missing programName`);
  }

  if (!statuses.has(snapshot.status)) {
    failures += fail(`${label}: status must be candidate, applied, approved, rejected, or expired`);
  }

  if (!datePattern.test(String(snapshot.capturedAt))) {
    failures += fail(`${label}: capturedAt must be YYYY-MM-DD`);
  }

  if (!snapshot.evidenceType || !snapshot.evidenceNote) {
    failures += fail(`${label}: missing evidenceType or evidenceNote`);
  }

  if (!Array.isArray(snapshot.targetArticleSlugs) || snapshot.targetArticleSlugs.length === 0) {
    failures += fail(`${label}: targetArticleSlugs must be a non-empty array`);
  } else {
    for (const slug of snapshot.targetArticleSlugs) {
      if (!articleSlugs.has(slug)) {
        failures += fail(`${label}: unknown target article "${slug}"`);
      }
    }
  }

  if (snapshot.status === "approved") {
    if (!Array.isArray(snapshot.creativeIds) || snapshot.creativeIds.length === 0) {
      failures += fail(`${label}: approved snapshot must reference at least one creativeId`);
    }

    if (!Array.isArray(snapshot.capturedUrls) || snapshot.capturedUrls.length === 0) {
      failures += fail(`${label}: approved snapshot must include capturedUrls`);
    }
  }

  for (const creativeId of snapshot.creativeIds ?? []) {
    if (!creativeIds.has(creativeId)) {
      failures += fail(`${label}: unknown creativeId "${creativeId}"`);
    }
  }

  for (const url of snapshot.capturedUrls ?? []) {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        failures += fail(`${label}: captured URL must use http or https`);
      }
    } catch {
      failures += fail(`${label}: invalid captured URL "${url}"`);
    }
  }
}

if (failures > 0) {
  console.error(`Affiliate snapshot validation failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log(`Affiliate snapshot validation passed for ${snapshots.length} snapshot(s).`);
