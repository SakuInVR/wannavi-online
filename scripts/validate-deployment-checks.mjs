import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const deploymentChecksPath = path.join(root, "content", "deployment-checks.json");
const allowedJobStatuses = new Set([
  "queued",
  "deploying",
  "succeeded",
  "failed",
  "rate_limited",
]);
const allowedCheckStatuses = new Set(["passed", "failed", "skipped"]);

function fail(message) {
  console.error(`- ${message}`);
  return 1;
}

if (!fs.existsSync(deploymentChecksPath)) {
  console.error("content/deployment-checks.json does not exist. Run npm run production:sync first.");
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(deploymentChecksPath, "utf8"));
let failures = 0;

if (payload.version !== 1) {
  failures += fail("deployment-checks.json version must be 1");
}

if (!payload.publishJob || typeof payload.publishJob !== "object") {
  failures += fail("deployment-checks.json missing publishJob");
} else {
  for (const field of ["id", "commitSha", "baseUrl", "status", "checkedAt"]) {
    if (!payload.publishJob[field]) {
      failures += fail(`publishJob missing ${field}`);
    }
  }

  if (!allowedJobStatuses.has(payload.publishJob.status)) {
    failures += fail(`invalid publishJob status "${payload.publishJob.status}"`);
  }
}

if (!Array.isArray(payload.checks) || payload.checks.length === 0) {
  failures += fail("deployment-checks.json checks must be a non-empty array");
} else {
  for (const [index, check] of payload.checks.entries()) {
    const label = `checks[${index}]`;

    for (const field of ["checkName", "targetUrl", "status", "checkedAt"]) {
      if (!check[field]) {
        failures += fail(`${label}: missing ${field}`);
      }
    }

    if (!allowedCheckStatuses.has(check.status)) {
      failures += fail(`${label}: invalid status "${check.status}"`);
    }

    if (!check.details || typeof check.details !== "object") {
      failures += fail(`${label}: missing details`);
    }
  }
}

if (failures > 0) {
  console.error(`Deployment check validation failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log(`Deployment check validation passed for ${payload.checks.length} check(s).`);
