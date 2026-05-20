import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const opportunitiesPath = path.join(root, "content", "asp-opportunities.json");
const articleStatesPath = path.join(root, "content", "article-states.json");

const allowedAsps = new Set(["a8", "moshimo", "valuecommerce", "other"]);
const allowedStatuses = new Set(["open", "searching", "applied", "approved", "rejected", "closed"]);

function fail(message) {
  console.error(`- ${message}`);
  return 1;
}

if (!fs.existsSync(opportunitiesPath)) {
  console.error("content/asp-opportunities.json does not exist. Run npm run asp:sync first.");
  process.exit(1);
}

if (!fs.existsSync(articleStatesPath)) {
  console.error("content/article-states.json does not exist. Run npm run pipeline:sync first.");
  process.exit(1);
}

const opportunities = JSON.parse(fs.readFileSync(opportunitiesPath, "utf8"));
const articleStates = JSON.parse(fs.readFileSync(articleStatesPath, "utf8"));
const stateBySlug = new Map(articleStates.states.map((state) => [state.slug, state]));

let failures = 0;

if (opportunities.version !== 1) {
  failures += fail("asp-opportunities.json version must be 1");
}

if (!Array.isArray(opportunities.opportunities)) {
  failures += fail("asp-opportunities must include opportunities array");
} else {
  const ids = new Set();

  for (const [index, opportunity] of opportunities.opportunities.entries()) {
    const label = `opportunities[${index}]`;

    if (!opportunity.id || typeof opportunity.id !== "string") {
      failures += fail(`${label}: missing id`);
    } else if (ids.has(opportunity.id)) {
      failures += fail(`${label}: duplicate id "${opportunity.id}"`);
    } else {
      ids.add(opportunity.id);
    }

    const articleState = stateBySlug.get(opportunity.articleSlug);
    if (!articleState) {
      failures += fail(`${label}: unknown articleSlug "${opportunity.articleSlug}"`);
    } else if (articleState.pipelineState !== "reviewed") {
      failures += fail(`${label}: article "${opportunity.articleSlug}" is not in reviewed state`);
    }

    if (!allowedStatuses.has(opportunity.status)) {
      failures += fail(`${label}: invalid status "${opportunity.status}"`);
    }

    if (!allowedAsps.has(opportunity.primaryAsp)) {
      failures += fail(`${label}: invalid primaryAsp "${opportunity.primaryAsp}"`);
    }

    if (!Array.isArray(opportunity.asps) || opportunity.asps.length === 0) {
      failures += fail(`${label}: asps must be a non-empty array`);
    } else {
      for (const asp of opportunity.asps) {
        if (!allowedAsps.has(asp)) {
          failures += fail(`${label}: invalid asp "${asp}"`);
        }
      }
    }

    if (!Array.isArray(opportunity.searchTerms) || opportunity.searchTerms.length < 3) {
      failures += fail(`${label}: searchTerms must include at least three terms`);
    }

    if (!opportunity.productAngle || typeof opportunity.productAngle !== "string") {
      failures += fail(`${label}: missing productAngle`);
    }

    if (!Array.isArray(opportunity.requiredEvidence) || opportunity.requiredEvidence.length < 5) {
      failures += fail(`${label}: requiredEvidence must list evidence fields`);
    }

    if (!opportunity.nextAction) {
      failures += fail(`${label}: missing nextAction`);
    }
  }
}

if (failures > 0) {
  console.error(`ASP opportunity validation failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log(`ASP opportunity validation passed for ${opportunities.opportunities.length} job(s).`);
