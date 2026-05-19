import fs from "node:fs";
import path from "node:path";

const baseUrl = process.env.AFFILIATE_CHECK_BASE_URL ?? "https://www.wannavi.online";
const root = process.cwd();
const source = fs.readFileSync(path.join(root, "src/lib/outbound-links.ts"), "utf8");

const links = [...source.matchAll(/id:\s*"([^"]+)"[\s\S]*?envKey:\s*"([^"]+)"/g)].map(
  ([, id, envKey]) => ({ id, envKey }),
);

if (links.length === 0) {
  console.error("No outbound affiliate links were found.");
  process.exit(1);
}

const failures = [];
const baseOrigin = new URL(baseUrl).origin;

for (const link of links) {
  const pathName = `/go/${link.id}`;
  const url = new URL(pathName, baseUrl);
  const response = await fetch(url, { redirect: "manual" });
  const location = response.headers.get("location") ?? "";

  if (![301, 302, 303, 307, 308].includes(response.status)) {
    failures.push(`${pathName}: expected redirect status, got ${response.status}`);
    continue;
  }

  if (!location) {
    failures.push(`${pathName}: missing Location header`);
    continue;
  }

  const redirectUrl = new URL(location, baseUrl);

  if (redirectUrl.origin === baseOrigin && redirectUrl.pathname === "/disclosure") {
    failures.push(`${pathName}: still falls back to /disclosure; set ${link.envKey} in Vercel`);
    continue;
  }

  if (redirectUrl.origin === baseOrigin) {
    failures.push(`${pathName}: redirects inside the site (${redirectUrl.href}); expected an affiliate URL`);
    continue;
  }

  console.log(`ok ${pathName} -> ${redirectUrl.origin}`);
}

if (failures.length > 0) {
  console.error("Affiliate redirect check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Affiliate redirect check passed for ${links.length} link(s).`);
