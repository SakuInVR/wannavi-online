import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function parseEnvFile(relativePath) {
  const filePath = path.join(root, relativePath);

  if (!fs.existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    read(relativePath)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        if (separatorIndex === -1) {
          return [line, ""];
        }

        const key = line.slice(0, separatorIndex).trim();
        const value = line
          .slice(separatorIndex + 1)
          .trim()
          .replace(/^["']|["']$/g, "");

        return [key, value];
      }),
  );
}

function getConfigValue(name) {
  const localEnv = parseEnvFile(".env.local");
  return process.env[name] || localEnv[name];
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

const requiredEnv = [
  "NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT",
  "NEXT_PUBLIC_GA_MEASUREMENT_ID",
  "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION",
];

for (const name of requiredEnv) {
  assert(Boolean(getConfigValue(name)), `Missing production environment variable: ${name}`);
}

const outboundLinks = read("src/lib/outbound-links.ts");
assert(!outboundLinks.includes('url: "",'), "Outbound link registry still contains empty urls");
assert(!outboundLinks.includes("url: ''"), "Outbound link registry still contains empty urls");

const site = read("src/lib/site.ts");
assert(
  !site.includes("contact@wannavi.online"),
  "siteConfig.contactEmail still uses the placeholder contact address",
);

const about = read("src/app/about/page.tsx");
assert(
  !about.includes("Wanna Naviは、なりたい自分へ進むための実践ロードマップをまとめるメディアです。"),
  "About page still looks like the starter placeholder",
);

if (failures.length > 0) {
  console.error("Production readiness check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Production readiness check passed.");
