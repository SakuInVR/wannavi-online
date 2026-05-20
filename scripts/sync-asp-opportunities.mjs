import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const articleStatesPath = path.join(root, "content", "article-states.json");
const outputPath = path.join(root, "content", "asp-opportunities.json");

const categoryDefaults = {
  dtm: {
    primaryAsp: "moshimo",
    asps: ["moshimo", "a8", "valuecommerce"],
    baseTerms: ["DTM", "音楽制作", "宅録", "楽器", "ヘッドホン", "オーディオインターフェース"],
  },
  "instrument-player": {
    primaryAsp: "moshimo",
    asps: ["moshimo", "a8", "valuecommerce"],
    baseTerms: ["楽器", "ピアノ", "ギター", "音楽教室", "防音", "電子ピアノ"],
  },
  "video-creator": {
    primaryAsp: "a8",
    asps: ["a8", "valuecommerce", "moshimo"],
    baseTerms: ["動画編集", "Premiere Pro", "動画編集スクール", "クリエイターPC", "教材"],
  },
  "vr-creator": {
    primaryAsp: "moshimo",
    asps: ["moshimo", "valuecommerce", "a8"],
    baseTerms: ["VRChat", "アバター", "3Dモデル", "ゲーミングPC", "Unity"],
  },
  "ai-engineer": {
    primaryAsp: "a8",
    asps: ["a8", "valuecommerce", "moshimo"],
    baseTerms: ["AI", "プログラミングスクール", "生成AI", "開発ツール", "クラウド"],
  },
};

const articleHints = {
  "dtm-headphones-guide": {
    searchTerms: ["モニターヘッドホン", "DTM ヘッドホン", "SONY MDR-CD900ST", "音楽制作 ヘッドホン"],
    productAngle: "モニターヘッドホン、楽器通販、DTM機材ショップ",
  },
  "dtm-home-studio-setup": {
    searchTerms: ["DTM スターターセット", "宅録 機材", "DTM機材", "防音 吸音材"],
    productAngle: "DTM機材セット、吸音材、楽器通販、オーディオ周辺機器",
  },
  "dtm-plugin-priority": {
    searchTerms: ["DTM プラグイン", "作曲 ソフト", "DAW プラグイン", "音源 プラグイン"],
    productAngle: "DAW、音源、プラグイン販売、作曲学習サービス",
  },
  "instrument-adult-piano-start": {
    searchTerms: ["ピアノ教室", "オンラインピアノ", "電子ピアノ", "大人 ピアノ"],
    productAngle: "オンライン音楽教室、電子ピアノ、楽譜アプリ",
  },
  "instrument-guitar-first-month": {
    searchTerms: ["ギター 初心者セット", "オンラインギター教室", "ギター 教室", "チューナー"],
    productAngle: "ギター初心者セット、オンラインレッスン、チューナー、教則教材",
  },
  "instrument-practice-room-setup": {
    searchTerms: ["防音室", "吸音材", "楽器 防音", "防音マット"],
    productAngle: "防音材、吸音材、簡易防音室、練習環境づくり",
  },
  "video-edit-cut-telop-first": {
    searchTerms: ["動画編集 スクール", "Premiere Pro 講座", "動画編集 講座", "テロップ 講座"],
    productAngle: "動画編集スクール、Premiere Pro講座、案件獲得講座",
  },
  "video-editing-pc-spec-guide": {
    searchTerms: ["動画編集 PC", "クリエイターPC", "BTO PC 動画編集", "Premiere Pro PC"],
    productAngle: "クリエイターPC、BTOパソコン、動画編集向けPC",
  },
  "vrchat-avatar-commission-checklist": {
    searchTerms: ["VRChat アバター", "3Dモデル", "アバター制作", "Unity アバター"],
    productAngle: "3Dモデル販売、アバター制作サービス、Unity学習、VRChat関連ツール",
  },
};

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

if (!fs.existsSync(articleStatesPath)) {
  console.error("content/article-states.json does not exist. Run npm run pipeline:sync first.");
  process.exit(1);
}

const articleStates = JSON.parse(fs.readFileSync(articleStatesPath, "utf8"));
const blockerStates = articleStates.states.filter(
  (state) =>
    state.pipelineState === "reviewed" &&
    state.affiliateIntent === "high" &&
    state.blockers.some((blocker) =>
      blocker.includes("no affiliate product mapping"),
    ),
);

const opportunities = blockerStates.map((state) => {
  const defaults = categoryDefaults[state.category] ?? {
    primaryAsp: "a8",
    asps: ["a8", "moshimo", "valuecommerce"],
    baseTerms: [],
  };
  const hints = articleHints[state.slug] ?? {};

  return {
    id: `${state.slug}-affiliate-search`,
    articleSlug: state.slug,
    articleTitle: state.title,
    category: state.category,
    priority: 100,
    status: "open",
    primaryAsp: defaults.primaryAsp,
    asps: defaults.asps,
    searchTerms: uniq([...(hints.searchTerms ?? []), ...defaults.baseTerms]),
    productAngle: hints.productAngle ?? "記事意図に合うASP商品を選定する",
    requiredEvidence: [
      "ASP名",
      "プログラム名",
      "提携状態",
      "報酬条件または成果条件",
      "取得日時",
      "広告素材URLまたは商品リンクURL",
      "対象記事との適合メモ"
    ],
    nextAction:
      "ChromeでASP管理画面を開き、searchTermsで検索して候補をcontent/affiliate-program-snapshots.jsonへ記録する。",
  };
});

const payload = {
  version: 1,
  generatedAt: new Date().toISOString(),
  source: "scripts/sync-asp-opportunities.mjs",
  opportunities,
};

fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${path.relative(root, outputPath)} with ${opportunities.length} ASP opportunity job(s).`);
