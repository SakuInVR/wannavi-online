import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

export function readAffiliateLinks() {
  const source = fs.readFileSync(path.join(root, "src/lib/outbound-links.ts"), "utf8");
  const staticLinks = [
    ...source.matchAll(/id:\s*"([^"]+)"[\s\S]*?envKey:\s*"([^"]+)"/g),
  ].map(([, id, envKey]) => ({ id, envKey, source: "category" }));

  const productPath = path.join(root, "content/affiliate-products.json");
  const products = fs.existsSync(productPath)
    ? JSON.parse(fs.readFileSync(productPath, "utf8"))
    : [];

  const productLinks = products.map((product) => ({
    id: product.id,
    envKey: product.envKey,
    source: "product",
  }));

  return [...staticLinks, ...productLinks];
}
