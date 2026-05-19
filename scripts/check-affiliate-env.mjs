import fs from "node:fs";
import path from "node:path";
import { readAffiliateLinks } from "./read-affiliate-links.mjs";

const root = process.cwd();
const envFiles = [".env.local", ".env"];

const links = readAffiliateLinks();

function readLocalEnv() {
  const values = {};

  for (const filename of envFiles) {
    const filePath = path.join(root, filename);

    if (!fs.existsSync(filePath)) {
      continue;
    }

    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

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
  }

  return values;
}

const localEnv = readLocalEnv();
const failures = [];

for (const link of links) {
  const value = process.env[link.envKey] ?? localEnv[link.envKey] ?? "";

  if (!value) {
    failures.push(`${link.envKey}: missing for /go/${link.id}`);
    continue;
  }

  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    failures.push(`${link.envKey}: invalid URL`);
    continue;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    failures.push(`${link.envKey}: URL must start with http or https`);
    continue;
  }

  if (parsed.hostname.endsWith("wannavi.online")) {
    failures.push(`${link.envKey}: points back to Wanna Navi; expected ASP URL`);
    continue;
  }

  console.log(`ok ${link.envKey} -> ${parsed.origin}`);
}

if (failures.length > 0) {
  console.error("Affiliate env check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Affiliate env check passed for ${links.length} link(s).`);
