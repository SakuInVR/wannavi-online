import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const articleStatesPath = path.join(root, "content", "article-states.json");
const aspOpportunitiesPath = path.join(root, "content", "asp-opportunities.json");
const deploymentChecksPath = path.join(root, "content", "deployment-checks.json");
const outputPath = path.join(root, "content", "improvement-tasks.json");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function taskId(articleSlug, type, discriminator) {
  return [articleSlug, type, discriminator].filter(Boolean).join("-");
}

function addTask(tasks, task) {
  tasks.push({
    id: taskId(task.articleSlug, task.type, task.discriminator),
    status: "open",
    source: "automation",
    ...task,
  });
}

if (!fs.existsSync(articleStatesPath)) {
  console.error("content/article-states.json does not exist. Run npm run pipeline:sync first.");
  process.exit(1);
}

const articleStates = readJson(articleStatesPath, { states: [] });
const aspOpportunities = readJson(aspOpportunitiesPath, { opportunities: [] });
const deploymentChecks = readJson(deploymentChecksPath, null);
const aspOpportunityBySlug = new Map(
  aspOpportunities.opportunities.map((opportunity) => [
    opportunity.articleSlug,
    opportunity,
  ]),
);

const tasks = [];

for (const state of articleStates.states) {
  const base = {
    articleSlug: state.slug,
    articleTitle: state.title,
    category: state.category,
    pipelineState: state.pipelineState,
  };

  if (
    state.affiliateIntent === "high" &&
    state.blockers.some((blocker) =>
      blocker.includes("no affiliate product mapping"),
    )
  ) {
    const opportunity = aspOpportunityBySlug.get(state.slug);
    addTask(tasks, {
      ...base,
      type: "affiliate-product",
      priority: 100,
      reason: "High-intent article has no affiliate product mapping.",
      action: opportunity
        ? `Use ASP opportunity ${opportunity.id}; search ${opportunity.primaryAsp} first for: ${opportunity.searchTerms.slice(0, 4).join(", ")}.`
        : "Run npm run asp:sync, then search ASP programs for a matching product.",
      evidenceTarget: opportunity
        ? `content/asp-opportunities.json#${opportunity.id}`
        : "content/asp-opportunities.json",
    });
  }

  if (
    state.affiliateIntent === "high" &&
    state.warnings.some((warning) =>
      warning.includes("approved image ad creative"),
    )
  ) {
    addTask(tasks, {
      ...base,
      type: "ad-creative",
      priority: 80,
      reason: "High-intent article has no approved image ad creative.",
      action:
        "Find an approved image banner or product creative, then add it to content/ad-creatives.json and place ProductAd in the article.",
      evidenceTarget: "content/ad-creatives.json",
    });
  }

  for (const warning of state.warnings) {
    if (warning.includes("Body is thin")) {
      addTask(tasks, {
        ...base,
        type: "depth",
        priority: 35,
        reason: warning,
        action:
          "Expand with concrete steps, failure cases, criteria, examples, and a next action section.",
        evidenceTarget: state.mdxPath,
      });
    }

    if (warning.includes("Missing decision asset")) {
      addTask(tasks, {
        ...base,
        type: "decision-asset",
        priority: 45,
        reason: warning,
        action:
          "Add a decision table, first-step checklist, recommendation component, or product ad.",
        evidenceTarget: state.mdxPath,
      });
    }
  }
}

if (deploymentChecks) {
  const failedChecks = (deploymentChecks.checks ?? []).filter(
    (check) => check.status !== "passed",
  );

  if (deploymentChecks.publishJob?.status !== "succeeded") {
    addTask(tasks, {
      articleSlug: "site-production",
      articleTitle: "Production deployment",
      category: "operations",
      pipelineState: "published",
      type: "deployment",
      discriminator: "publish-job",
      priority: 90,
      reason: `Production verification status is ${deploymentChecks.publishJob?.status ?? "unknown"}.`,
      action:
        "Inspect content/deployment-checks.json, fix failed deployment checks, then rerun npm run production:sync.",
      evidenceTarget: "content/deployment-checks.json",
    });
  }

  for (const check of failedChecks.slice(0, 10)) {
    addTask(tasks, {
      articleSlug: check.details?.slug ?? "site-production",
      articleTitle: check.checkName,
      category: "operations",
      pipelineState: "published",
      type: "deployment",
      discriminator: check.checkName,
      priority: 60,
      reason: `${check.checkName} failed for ${check.targetUrl}.`,
      action:
        "Repair the production mismatch or deployment issue, then rerun npm run production:sync.",
      evidenceTarget: "content/deployment-checks.json",
    });
  }
}

tasks.sort((a, b) => b.priority - a.priority || a.articleSlug.localeCompare(b.articleSlug));

const payload = {
  version: 1,
  generatedAt: new Date().toISOString(),
  source: "scripts/sync-improvement-tasks.mjs",
  tasks,
};

fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${path.relative(root, outputPath)} with ${tasks.length} improvement task(s).`);
