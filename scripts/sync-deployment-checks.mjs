import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const articleStatesPath = path.join(root, "content", "article-states.json");
const outputPath = path.join(root, "content", "deployment-checks.json");
const baseUrl = process.env.PRODUCTION_BASE_URL ?? "https://www.wannavi.online";
const expectedSha = process.env.GIT_SHA ?? getCurrentSha();
const timeoutMs = Number(process.env.PRODUCTION_CHECK_TIMEOUT_MS ?? 15000);

function getCurrentSha() {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
}

function getCurrentBranch() {
  return execFileSync("git", ["branch", "--show-current"], {
    encoding: "utf8",
  }).trim();
}

function getRemoteUrl() {
  try {
    return execFileSync("git", ["remote", "get-url", "origin"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });
    const body = await response.text();
    return { response, body };
  } finally {
    clearTimeout(timer);
  }
}

async function runCheck(checks, checkName, targetUrl, fn) {
  const startedAt = new Date().toISOString();

  try {
    const details = await fn();
    checks.push({
      checkName,
      targetUrl,
      status: details.status,
      details,
      checkedAt: startedAt,
    });
  } catch (error) {
    checks.push({
      checkName,
      targetUrl,
      status: "failed",
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
      checkedAt: startedAt,
    });
  }
}

const articleStates = readJson(articleStatesPath, { states: [] });
const locallyPublishedArticles = articleStates.states.filter(
  (state) => state.pipelineState === "published",
);
const checks = [];

await runCheck(checks, "build-info", `${baseUrl}/build-info`, async () => {
  const { response, body } = await fetchWithTimeout(`${baseUrl}/build-info`);
  const details = {
    statusCode: response.status,
    expectedSha,
    productionSha: null,
    deploymentUrl: null,
    environment: null,
    status: "failed",
  };

  if (response.status !== 200) {
    return details;
  }

  const payload = JSON.parse(body);
  details.productionSha = payload.commitSha ?? null;
  details.deploymentUrl = payload.deploymentUrl ?? null;
  details.environment = payload.environment ?? null;
  details.status = payload.commitSha === expectedSha ? "passed" : "failed";
  return details;
});

await runCheck(checks, "home", baseUrl, async () => {
  const { response, body } = await fetchWithTimeout(baseUrl);
  return {
    statusCode: response.status,
    hasSiteName: body.includes("Wanna Navi"),
    status: response.status === 200 && body.includes("Wanna Navi") ? "passed" : "failed",
  };
});

await runCheck(checks, "sitemap", `${baseUrl}/sitemap.xml`, async () => {
  const { response, body } = await fetchWithTimeout(`${baseUrl}/sitemap.xml`);
  const missingArticles = locallyPublishedArticles
    .map((article) => article.slug)
    .filter((slug) => !body.includes(`${baseUrl}/articles/${slug}`));

  return {
    statusCode: response.status,
    articleCount: locallyPublishedArticles.length,
    missingArticles,
    status: response.status === 200 && missingArticles.length === 0 ? "passed" : "failed",
  };
});

for (const article of locallyPublishedArticles) {
  await runCheck(
    checks,
    "article-page",
    `${baseUrl}/articles/${article.slug}`,
    async () => {
      const url = `${baseUrl}/articles/${article.slug}`;
      const { response, body } = await fetchWithTimeout(url);
      const hasTitle = body.includes(article.title);
      const hasAdsenseMeta = body.includes("google-adsense-account");

      return {
        slug: article.slug,
        statusCode: response.status,
        hasTitle,
        hasAdsenseMeta,
        status: response.status === 200 && hasTitle && hasAdsenseMeta ? "passed" : "failed",
      };
    },
  );
}

const failedChecks = checks.filter((check) => check.status !== "passed");
const publishJobStatus = failedChecks.length === 0 ? "succeeded" : "failed";

const payload = {
  version: 1,
  generatedAt: new Date().toISOString(),
  source: "scripts/sync-deployment-checks.mjs",
  publishJob: {
    id: `${expectedSha.slice(0, 12)}-production`,
    commitSha: expectedSha,
    branch: getCurrentBranch(),
    remoteUrl: getRemoteUrl(),
    baseUrl,
    status: publishJobStatus,
    checkedAt: new Date().toISOString(),
  },
  checks,
};

fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(
  `Wrote ${path.relative(root, outputPath)} with ${checks.length} deployment check(s); status=${publishJobStatus}.`,
);
