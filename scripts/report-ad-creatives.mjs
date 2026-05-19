import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const creativePath = path.join(root, "content", "ad-creatives.json");

const creatives = fs.existsSync(creativePath)
  ? JSON.parse(fs.readFileSync(creativePath, "utf8"))
  : [];

const groups = new Map();

for (const creative of creatives) {
  const key = `${creative.asp}:${creative.status}`;
  groups.set(key, (groups.get(key) ?? 0) + 1);
}

console.log("Ad creative report");
console.log("==================");
console.log("");

if (creatives.length === 0) {
  console.log("No ad creatives registered.");
  process.exit(0);
}

for (const [key, count] of [...groups.entries()].sort()) {
  console.log(`${key}: ${count}`);
}

console.log("");
console.log("Next candidates");

for (const creative of creatives.filter((item) => item.status !== "approved")) {
  console.log(
    `- ${creative.id}: ${creative.asp}, ${creative.status}, product=${creative.productId}`,
  );
}
