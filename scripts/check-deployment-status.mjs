import { execFileSync } from "node:child_process";

const repository =
  process.env.GITHUB_REPOSITORY ??
  process.argv[2] ??
  getRepositoryFromRemote() ??
  "SakuInVR/wannavi-online";
const sha = process.env.GIT_SHA ?? process.argv[3] ?? getCurrentSha();
const requiredVercelContext =
  process.env.VERCEL_REQUIRED_STATUS_CONTEXT ?? "Vercel – wannavi_online";

function getCurrentSha() {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
}

function getRepositoryFromRemote() {
  try {
    const remote = execFileSync("git", ["remote", "get-url", "origin"], {
      encoding: "utf8",
    }).trim();
    const match =
      remote.match(/github\.com[:/](.+\/.+?)(?:\.git)?$/) ??
      remote.match(/^https:\/\/github\.com\/(.+\/.+?)(?:\.git)?$/);

    return match?.[1];
  } catch {
    return undefined;
  }
}

async function github(path) {
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
    headers: {
      "User-Agent": "wannavi-deployment-check",
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

const [status, deployments] = await Promise.all([
  github(`/commits/${sha}/status`),
  github(`/deployments?per_page=20`),
]);

console.log(`Repository: ${repository}`);
console.log(`Commit: ${sha}`);
console.log(`Combined status: ${status.state}`);

const vercelStatuses = status.statuses.filter((item) =>
  item.context.toLowerCase().includes("vercel"),
);
const requiredVercelStatuses = vercelStatuses.filter(
  (item) => item.context === requiredVercelContext,
);

if (vercelStatuses.length === 0) {
  console.log("Vercel status: none found for this commit");
} else {
  console.log("Vercel statuses:");
  for (const item of vercelStatuses) {
    console.log(`- ${item.context}: ${item.state} (${item.description})`);
    if (item.target_url) {
      console.log(`  ${item.target_url}`);
    }
  }
}

if (requiredVercelStatuses.length > 0) {
  console.log(`Required Vercel context: ${requiredVercelContext}`);
} else if (vercelStatuses.length > 0) {
  console.warn(
    `Required Vercel context "${requiredVercelContext}" was not found; falling back to all Vercel statuses.`,
  );
}

const matchingDeployments = deployments.filter((deployment) => deployment.sha === sha);

if (matchingDeployments.length === 0) {
  console.log("Deployments for this commit: none");
} else {
  console.log("Deployments for this commit:");
  for (const deployment of matchingDeployments) {
    const statuses = await github(`/deployments/${deployment.id}/statuses`);
    const latest = statuses[0];
    console.log(
      `- ${deployment.environment}: ${latest?.state ?? "unknown"} ${latest?.environment_url ?? ""}`,
    );
  }
}

const duplicatedEnvironments = deployments
  .slice(0, 10)
  .reduce((groups, deployment) => {
    const key = deployment.sha;
    groups.set(key, [...(groups.get(key) ?? []), deployment.environment]);
    return groups;
  }, new Map());

const duplicates = [...duplicatedEnvironments.entries()].filter(
  ([, environments]) => new Set(environments).size > 1,
);

if (duplicates.length > 0) {
  console.warn("Potential duplicate Vercel projects detected:");
  for (const [commit, environments] of duplicates) {
    console.warn(`- ${commit.slice(0, 7)}: ${[...new Set(environments)].join(", ")}`);
  }
}

const statusesToGate =
  requiredVercelStatuses.length > 0 ? requiredVercelStatuses : vercelStatuses;

if (
  statusesToGate.some((item) =>
    item.description.toLowerCase().includes("rate limited"),
  )
) {
  console.error("Vercel deployment is rate limited. Retry after the Vercel limit resets.");
  process.exitCode = 1;
} else if (statusesToGate.some((item) => item.state === "failure" || item.state === "error")) {
  process.exitCode = 1;
} else if (statusesToGate.some((item) => item.state === "pending")) {
  process.exitCode = 1;
}
