import { execFileSync } from "node:child_process";

const baseUrl = process.env.PRODUCTION_BASE_URL ?? "https://www.wannavi.online";
const expectedSha = process.env.GIT_SHA ?? getCurrentSha();

function getCurrentSha() {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
}

const response = await fetch(new URL("/build-info", baseUrl), {
  cache: "no-store",
});

if (response.status !== 200) {
  console.error(`build-info: expected 200, got ${response.status}`);
  console.error("Production may be running an older build without /build-info.");
  process.exitCode = 1;
} else {
  const buildInfo = await response.json();

  console.log(`Production URL: ${baseUrl}`);
  console.log(`Expected commit: ${expectedSha}`);
  console.log(`Production commit: ${buildInfo.commitSha ?? "unknown"}`);
  console.log(`Production deployment URL: ${buildInfo.deploymentUrl ?? "unknown"}`);
  console.log(`Production environment: ${buildInfo.environment ?? "unknown"}`);

  if (!buildInfo.commitSha) {
    console.error("Production build does not expose VERCEL_GIT_COMMIT_SHA.");
    process.exitCode = 1;
  } else if (buildInfo.commitSha !== expectedSha) {
    console.error("Production is not serving the expected commit.");
    process.exitCode = 1;
  } else {
    console.log("Production is serving the expected commit.");
  }
}
