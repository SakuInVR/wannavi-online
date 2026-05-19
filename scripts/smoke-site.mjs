const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

const checks = [
  { path: "/", includes: "あなたは、何になりたい？" },
  { path: "/articles", includes: "全記事" },
  { path: "/categories", includes: "カテゴリ一覧" },
  { path: "/tags", includes: "タグ一覧" },
  { path: "/tags/DTM", includes: "DTM の記事" },
  { path: "/categories/ai-engineer", includes: "AIエンジニアになりたい" },
  { path: "/categories/instrument-player", includes: "楽器演奏者になりたい" },
  {
    path: "/articles/ai-engineer-first-month",
    includes: "AIエンジニアになりたい人の最初の1ヶ月ロードマップ",
  },
  {
    path: "/articles/instrument-player-first-month",
    includes: "楽器演奏者になりたい人の最初の1ヶ月ロードマップ",
  },
  { path: "/about", includes: "運営者情報" },
  { path: "/privacy", includes: "プライバシーポリシー" },
  { path: "/contact", includes: "お問い合わせ" },
  { path: "/disclosure", includes: "広告・PR表記" },
  { path: "/sitemap.xml", includes: "/articles/ai-engineer-first-month" },
  { path: "/robots.txt", includes: "Disallow: /go/" },
  { path: "/feed.xml", includes: "<rss version=\"2.0\">" },
  { path: "/ads.txt", includes: "google.com, pub-9852760004523512" },
  { path: "/go/ai-tools", expectedStatus: 302, locationIncludes: "/disclosure" },
];

async function checkRoute({ path, includes, expectedStatus = 200, locationIncludes }) {
  const url = new URL(path, baseUrl);
  const response = await fetch(url, { redirect: "manual" });
  const text = await response.text();

  if (response.status !== expectedStatus) {
    throw new Error(`${path}: expected ${expectedStatus}, got ${response.status}`);
  }

  if (includes && !text.includes(includes)) {
    throw new Error(`${path}: missing expected text "${includes}"`);
  }

  if (locationIncludes) {
    const location = response.headers.get("location") ?? "";
    if (!location.includes(locationIncludes)) {
      throw new Error(`${path}: expected Location to include "${locationIncludes}", got "${location}"`);
    }
  }

  console.log(`ok ${path}`);
}

const failures = [];

for (const check of checks) {
  try {
    await checkRoute(check);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }
}

if (failures.length > 0) {
  console.error("Smoke test failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Smoke test passed for ${checks.length} route(s).`);
