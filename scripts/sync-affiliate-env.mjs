import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { readAffiliateLinks } from "./read-affiliate-links.mjs";

const root = process.cwd();
const envFile = process.env.AFFILIATE_ENV_FILE ?? ".env.affiliate.local";
const envPath = path.join(root, envFile);
const apply = process.argv.includes("--apply");
const requiredLinks = readAffiliateLinks();
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const useShell = process.platform === "win32";

function readEnvFile() {
  if (!fs.existsSync(envPath)) {
    console.error(`${envFile} does not exist. Copy .env.affiliate.example and replace values first.`);
    process.exit(1);
  }

  const values = {};
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const index = trimmed.indexOf("=");

    if (index === -1) {
      continue;
    }

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    values[key] = value;
  }

  return values;
}

function validateUrl(key, value) {
  if (!value) {
    return `${key}: missing`;
  }

  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    return `${key}: invalid URL`;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return `${key}: URL must start with http or https`;
  }

  if (parsed.hostname.endsWith("wannavi.online")) {
    return `${key}: points back to Wanna Navi; expected ASP URL`;
  }

  if (parsed.hostname === "example.com") {
    return `${key}: still uses example.com placeholder`;
  }

  return undefined;
}

function vercelEnvList() {
  try {
    return execFileSync(npx, ["vercel", "env", "ls"], {
      cwd: root,
      encoding: "utf8",
      shell: useShell,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    console.error("Could not read Vercel env vars. Run `npx vercel link --yes --project wannavi_online` first.");
    console.error(error.stderr?.toString() || error.message);
    process.exit(1);
  }
}

const localEnv = readEnvFile();
const failures = [];
const uniqueLinks = [
  ...new Map(requiredLinks.map((link) => [link.envKey, link])).values(),
];

for (const link of uniqueLinks) {
  const failure = validateUrl(link.envKey, localEnv[link.envKey]);

  if (failure) {
    failures.push(failure);
  }
}

if (failures.length > 0) {
  console.error("Affiliate env sync validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

const currentVercelEnv = vercelEnvList();

console.log(`Read ${uniqueLinks.length} affiliate URL(s) from ${envFile}.`);

for (const link of uniqueLinks) {
  const existsInProduction = new RegExp(`\\b${link.envKey}\\b[\\s\\S]*Production`).test(
    currentVercelEnv,
  );

  if (existsInProduction) {
    console.log(`skip ${link.envKey}: already exists in Vercel Production`);
    continue;
  }

  if (!apply) {
    console.log(`dry-run ${link.envKey}: would add to Vercel Production`);
    continue;
  }

  const child = spawnSync(npx, ["vercel", "env", "add", link.envKey, "production"], {
    cwd: root,
    input: `${localEnv[link.envKey]}\n`,
    encoding: "utf8",
    shell: useShell,
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (child.status !== 0) {
    console.error(`failed ${link.envKey}`);
    console.error(child.stderr || child.stdout);
    process.exit(child.status ?? 1);
  }

  console.log(`added ${link.envKey} to Vercel Production`);
}

if (!apply) {
  console.log("Dry-run only. Add -- --apply to write missing values to Vercel.");
}
