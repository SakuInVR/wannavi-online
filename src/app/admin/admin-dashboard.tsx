"use client";

import { useState, useEffect } from "react";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export interface Article {
  id: string;
  title: string;
  category: string;
  review_status: string;
  created_at: string;
}

export interface UserCategory {
  id: string;
  slug: string;
  title: string;
  description: string;
  accent: string;
}

export interface AspMaterial {
  id: string;
  name: string;
  description: string;
  asp_name: string;
  affiliate_url: string | null;
  image_url: string | null;
  price_note: string | null;
  category_hint: string | null;
  usage_type: string;
  display_style: string;
  placement_context: string | null;
  variation_label: string | null;
  material_type: string;
  banner_width: number | null;
  banner_height: number | null;
  text_content: string | null;
  link_normal: string | null;
  link_amp: string | null;
  link_nojs: string | null;
  disclosure_info: string | null;
  status: string;
  created_at: string;
}

export interface Stats {
  pending: number;
  approved: number;
  rejected: number;
  materials: number;
}

type Tab = "overview" | "new-article" | "asp-materials" | "categories" | "review";

/* ------------------------------------------------------------------ */
/* Dashboard                                                          */
/* ------------------------------------------------------------------ */

export function AdminDashboard({
  initialPending,
  initialCategories,
  initialAspMaterials,
  initialStats,
  supabaseConfigured,
}: {
  initialPending: Article[];
  initialCategories: UserCategory[];
  initialAspMaterials: AspMaterial[];
  initialStats: Stats;
  supabaseConfigured: boolean;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [pending, setPending] = useState<Article[]>(initialPending);
  const [categories, setCategories] = useState<UserCategory[]>(initialCategories);
  const [aspMaterials, setAspMaterials] = useState<AspMaterial[]>(initialAspMaterials);
  const [, setStats] = useState(initialStats);

  async function refreshPending() {
    const res = await fetch("/api/admin/articles/pending");
    if (res.ok) setPending(await res.json());
  }
  async function refreshCategories() {
    const res = await fetch("/api/admin/categories");
    if (res.ok) setCategories(await res.json());
  }
  async function refreshAspMaterials() {
    const res = await fetch("/api/admin/asp-materials");
    if (res.ok) setAspMaterials(await res.json());
  }

  useEffect(() => {
    if (!supabaseConfigured) return;
    refreshPending();
    refreshCategories();
    refreshAspMaterials();
  }, [tab, supabaseConfigured]);

  if (!supabaseConfigured) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10 text-center">
        <h1 className="text-xl font-bold text-gray-900">管理画面</h1>
        <p className="mt-4 text-gray-500">
          Supabase の環境変数が未設定です。.env を確認してください。
        </p>
      </main>
    );
  }

  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key: "overview", label: "概要", emoji: "📊" },
    { key: "new-article", label: "記事生成", emoji: "✍️" },
    { key: "asp-materials", label: "ASP素材", emoji: "🔗" },
    { key: "categories", label: "カテゴリ", emoji: "📁" },
    { key: "review", label: "レビュー待ち", emoji: "⏳" },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
        <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
          🛠️ Wanna Navi 管理画面
        </h1>
      </header>

      <nav className="flex overflow-x-auto border-b border-gray-200 bg-white px-2 sm:px-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors sm:px-4 ${
              tab === t.key
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {tab === "overview" && (
          <OverviewTab stats={initialStats} pendingCount={pending.length} />
        )}
        {tab === "new-article" && (
          <NewArticleTab
            categories={categories}
            aspMaterials={aspMaterials}
            onGenerated={() => {
              refreshPending();
              setTab("review");
            }}
          />
        )}
        {tab === "asp-materials" && (
          <AspMaterialsTab
            materials={aspMaterials}
            onRefresh={refreshAspMaterials}
          />
        )}
        {tab === "categories" && (
          <CategoriesTab
            categories={categories}
            onRefresh={refreshCategories}
          />
        )}
        {tab === "review" && (
          <ReviewTab articles={pending} onRefresh={refreshPending} />
        )}
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Tab: Overview                                                      */
/* ------------------------------------------------------------------ */

function OverviewTab({ stats, pendingCount }: { stats: Stats; pendingCount: number }) {
  const cards = [
    { label: "レビュー待ち", value: pendingCount, color: "bg-yellow-100 text-yellow-800" },
    { label: "承認済み", value: stats.approved, color: "bg-green-100 text-green-800" },
    { label: "却下", value: stats.rejected, color: "bg-red-100 text-red-800" },
    { label: "ASP素材", value: stats.materials, color: "bg-blue-100 text-blue-800" },
  ];

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900">📊 概要</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-lg px-4 py-5 text-center ${c.color}`}>
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="mt-1 text-xs font-medium">{c.label}</div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-gray-500">
        「記事生成」タブからDeepSeekで記事を自動生成し、レビュー→承認/却下のフローを回します。
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab: New Article                                                   */
/* ------------------------------------------------------------------ */

function NewArticleTab({
  categories,
  aspMaterials,
  onGenerated,
}: {
  categories: UserCategory[];
  aspMaterials: AspMaterial[];
  onGenerated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [youtube1, setYoutube1] = useState("");
  const [youtube2, setYoutube2] = useState("");
  const [youtube3, setYoutube3] = useState("");
  const [selectedAsps, setSelectedAsps] = useState<string[]>([]);
  const [extraInstructions, setExtraInstructions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [result, setResult] = useState<{
    type: "success" | "error"; text: string; articleId?: string;
  } | null>(null);

  const allCategories = [
    { slug: "ai-engineer", title: "AIエンジニアになりたい" },
    { slug: "dtm", title: "DTMerになりたい" },
    { slug: "vr-creator", title: "VRクリエイターになりたい" },
    { slug: "instrument-player", title: "楽器演奏者になりたい" },
    { slug: "video-creator", title: "動画クリエイターになりたい" },
    ...categories.map((c) => ({ slug: c.slug, title: c.title })),
  ];

  function toggleAsp(id: string) {
    setSelectedAsps((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleGenerate() {
    if (!title.trim()) { setResult({ type: "error", text: "タイトルを入力してください" }); return; }
    if (!category) { setResult({ type: "error", text: "カテゴリを選択してください" }); return; }

    setGenerating(true);
    setResult(null);

    const youtubeUrls = [youtube1, youtube2, youtube3].filter(Boolean);

    try {
      // Step 1: Gemini research
      setStatusText("🔍 Geminiで動画リサーチ中...");
      
      const res = await fetch("/api/admin/articles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          asp_material_ids: selectedAsps.length > 0 ? selectedAsps : undefined,
          extra_instructions: extraInstructions.trim() || undefined,
          youtube_urls: youtubeUrls.length > 0 ? youtubeUrls : undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        setResult({ type: "error", text: json.error ?? "生成に失敗しました" });
        return;
      }

      const json = await res.json();
      
      const parts: string[] = [`✅ 記事生成完了 (${json.tokens_used ?? "?"} tokens)`];
      if (json.research_sources > 0) parts.push(`📹 ${json.research_sources}件の動画リサーチを実施`);
      if (json.asp_materials_used > 0) parts.push(`🔗 ${json.asp_materials_used}件のASP素材を自動挿入`);
      
      setResult({ type: "success", text: parts.join(" / "), articleId: json.article_id });
      setTitle(""); setExtraInstructions(""); setSelectedAsps([]);
      setYoutube1(""); setYoutube2(""); setYoutube3("");
      onGenerated();
    } catch {
      setResult({ type: "error", text: "ネットワークエラー" });
    } finally {
      setGenerating(false);
      setStatusText("");
    }
  }

  const usageLabels: Record<string, string> = {
    recommendation: "おすすめ", comparison: "比較用", tool_intro: "道具紹介",
    budget_option: "予算別", step_up: "次のステップ",
  };

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        ✍️ 記事の自動生成
      </h2>

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
        {/* Title */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">記事タイトル <span className="text-red-500">*</span></label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="例：大人のピアノ練習法 初心者でも3ヶ月で弾けるようになる秘訣"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        </div>

        {/* Category */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">カテゴリ <span className="text-red-500">*</span></label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
            <option value="">選択してください</option>
            {allCategories.map((c) => (<option key={c.slug} value={c.slug}>{c.title}</option>))}
          </select>
        </div>

        {/* YouTube URLs (optional) */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            📹 YouTube URL <span className="text-xs text-gray-400">（任意・最大3件 / 未入力時はGeminiが自動リサーチ）</span>
          </label>
          <div className="space-y-2">
            <input type="url" value={youtube1} onChange={(e) => setYoutube1(e.target.value)}
              placeholder="動画A: 初心者がぶつかる壁" className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs" />
            <input type="url" value={youtube2} onChange={(e) => setYoutube2(e.target.value)}
              placeholder="動画B: 上級者の練習ロジック" className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs" />
            <input type="url" value={youtube3} onChange={(e) => setYoutube3(e.target.value)}
              placeholder="動画C: 機材・デバイスレビュー" className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs" />
          </div>
        </div>

        {/* ASP materials */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            🔗 ASP素材 <span className="text-xs text-gray-400">（選択しない場合は自動でマッチする素材を使用）</span>
          </label>
          {aspMaterials.length === 0 ? (
            <p className="text-xs text-gray-400">ASP素材未登録のため、Amazon商品名が本文に含まれます（レビュー時にリンク注入してください）</p>
          ) : (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2">
              {aspMaterials.map((m) => (
                <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50">
                  <input type="checkbox" checked={selectedAsps.includes(m.id)} onChange={() => toggleAsp(m.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                  <span className="font-medium truncate">{m.name}</span>
                  <span className="text-xs text-gray-400">[{usageLabels[m.usage_type]}]</span>
                  {m.price_note && <span className="text-xs text-green-600">{m.price_note}</span>}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Extra instructions */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">追加指示 <span className="text-xs text-gray-400">（任意）</span></label>
          <textarea value={extraInstructions} onChange={(e) => setExtraInstructions(e.target.value)}
            rows={2} placeholder="例：読者ターゲットは40代男性"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        </div>

        {/* Pipeline info */}
        <div className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500">
          🔄 自動パイプライン: Gemini動画リサーチ → DeepSeek記事執筆 → ASP素材自動挿入 → レビュー待ち
        </div>

        {/* Submit */}
        <button onClick={handleGenerate} disabled={generating}
          className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {statusText || "生成中...（1〜2分）"}
            </span>
          ) : (
            "🚀 記事を自動生成する"
          )}
        </button>

        {result && (
          <div className={`rounded-md px-4 py-3 text-sm ${result.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
            {result.text}
            {result.articleId && <a href={`/admin/review/${result.articleId}`} className="ml-3 font-medium underline">レビューする →</a>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab: ASP Materials (redesigned: type/banner size/3 links/disclosure)*/
/* ------------------------------------------------------------------ */

function AspMaterialsTab({
  materials,
  onRefresh,
}: {
  materials: AspMaterial[];
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [aspName, setAspName] = useState("");
  const [materialType, setMaterialType] = useState<"banner" | "text">("banner");
  const [bannerWidth, setBannerWidth] = useState("");
  const [bannerHeight, setBannerHeight] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [linkNormal, setLinkNormal] = useState("");
  const [linkAmp, setLinkAmp] = useState("");
  const [linkNojs, setLinkNojs] = useState("");
  const [disclosureInfo, setDisclosureInfo] = useState("");
  const [description, setDescription] = useState("");
  const [priceNote, setPriceNote] = useState("");
  const [usageType, setUsageType] = useState("recommendation");
  const [displayStyle, setDisplayStyle] = useState("product_card");

  function resetForm() {
    setName(""); setAspName(""); setMaterialType("banner"); setBannerWidth(""); setBannerHeight("");
    setImageUrl(""); setTextContent(""); setLinkNormal(""); setLinkAmp(""); setLinkNojs("");
    setDisclosureInfo(""); setDescription(""); setPriceNote("");
    setUsageType("recommendation"); setDisplayStyle("product_card");
  }

  async function handleSave() {
    if (!name.trim() || !aspName.trim()) { setMsg("タイトルとASP名は必須"); return; }
    if (materialType === "banner" && !linkNormal.trim()) { setMsg("標準リンクは必須"); return; }
    if (materialType === "text" && !textContent.trim()) { setMsg("テキスト内容は必須"); return; }

    setSaving(true); setMsg(null);
    const res = await fetch("/api/admin/asp-materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(), asp_name: aspName.trim(),
        material_type: materialType,
        banner_width: bannerWidth ? parseInt(bannerWidth) : null,
        banner_height: bannerHeight ? parseInt(bannerHeight) : null,
        image_url: imageUrl.trim() || null,
        text_content: materialType === "text" ? textContent.trim() : null,
        link_normal: linkNormal.trim() || null,
        link_amp: linkAmp.trim() || null,
        link_nojs: linkNojs.trim() || null,
        disclosure_info: disclosureInfo.trim() || null,
        description: description.trim(),
        price_note: priceNote.trim() || null,
        usage_type: usageType,
        display_style: displayStyle,
      }),
    });
    if (res.ok) { resetForm(); setShowForm(false); onRefresh(); }
    else { const j = await res.json(); setMsg(j.error ?? "保存失敗"); }
    setSaving(false);
  }

  async function handleArchive(id: string) {
    await fetch("/api/admin/asp-materials", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "archived" }),
    });
    onRefresh();
  }

  const usageLabels: Record<string, string> = {
    recommendation: "おすすめ", comparison: "比較用", tool_intro: "道具紹介",
    budget_option: "予算別", step_up: "次のステップ",
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          🔗 ASP素材一覧 <span className="text-sm font-normal text-gray-400">({materials.length}件)</span>
        </h2>
        <button onClick={() => { setShowForm(!showForm); setMsg(null); }}
          className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 sm:text-sm">
          ＋ 新規追加
        </button>
      </div>

      {showForm && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
          {/* Row 1: Title + ASP name + Material type */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="タイトル *" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input type="text" value={aspName} onChange={(e) => setAspName(e.target.value)}
              placeholder="ASP名 (A8.net等) *" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <select value={materialType} onChange={(e) => setMaterialType(e.target.value as "banner" | "text")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="banner">バナー広告</option>
              <option value="text">テキスト広告</option>
            </select>
          </div>

          {/* Banner-specific */}
          {materialType === "banner" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500">横幅 (px)</label>
                <input type="number" value={bannerWidth} onChange={(e) => setBannerWidth(e.target.value)}
                  placeholder="100" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">高さ (px)</label>
                <input type="number" value={bannerHeight} onChange={(e) => setBannerHeight(e.target.value)}
                  placeholder="60" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">画像URL</label>
                <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..." className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
          )}

          {/* Text-specific */}
          {materialType === "text" && (
            <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)}
              placeholder="テキスト広告の本文 *" rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          )}

          {/* Links (3 types) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input type="url" value={linkNormal} onChange={(e) => setLinkNormal(e.target.value)}
              placeholder="標準リンク *" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input type="url" value={linkAmp} onChange={(e) => setLinkAmp(e.target.value)}
              placeholder="AMP対応リンク" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input type="url" value={linkNojs} onChange={(e) => setLinkNojs(e.target.value)}
              placeholder="JS非対応リンク" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>

          {/* Disclosure */}
          <textarea value={disclosureInfo} onChange={(e) => setDisclosureInfo(e.target.value)}
            placeholder="提携情報表示（例：当サイトはA8.netのアフィリエイトプログラムに参加しています）" rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />

          {/* Extra fields */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="説明" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input type="text" value={priceNote} onChange={(e) => setPriceNote(e.target.value)}
              placeholder="価格帯" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <select value={usageType} onChange={(e) => setUsageType(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="recommendation">おすすめ</option>
              <option value="comparison">比較用</option>
              <option value="tool_intro">道具紹介</option>
              <option value="budget_option">予算別</option>
              <option value="step_up">次のステップ</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
              {saving ? "保存中..." : "保存"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300">キャンセル</button>
          </div>
          {msg && <p className="text-sm text-red-600">{msg}</p>}
        </div>
      )}

      {/* List */}
      {materials.length === 0 ? (
        <p className="text-sm text-gray-500">ASP素材が未登録です。「新規追加」から登録してください。</p>
      ) : (
        <ul className="space-y-2">
          {materials.map((m) => (
            <li key={m.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-gray-900 truncate">{m.name}</span>
                    <span className={`text-xs px-1.5 rounded shrink-0 ${m.material_type === "banner" ? "bg-purple-100 text-purple-700" : "bg-teal-100 text-teal-700"}`}>
                      {m.material_type === "banner" ? `🖼 ${m.banner_width ?? "?"}×${m.banner_height ?? "?"}` : "📝 テキスト"}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">[{m.asp_name}]</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">{usageLabels[m.usage_type]}</span>
                    {m.price_note && <span className="text-xs text-green-600">{m.price_note}</span>}
                  </div>
                  {m.description && <p className="mt-1 text-xs text-gray-500 line-clamp-1">{m.description}</p>}

                  {/* Links */}
                  <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                    {m.link_normal && (
                      <span className="text-blue-600">
                        <a href={m.link_normal} target="_blank" rel="noopener noreferrer" className="underline">標準</a>
                      </span>
                    )}
                    {m.link_amp && (
                      <span className="text-orange-600">
                        <a href={m.link_amp} target="_blank" rel="noopener noreferrer" className="underline">AMP</a>
                      </span>
                    )}
                    {m.link_nojs && (
                      <span className="text-gray-500">
                        <a href={m.link_nojs} target="_blank" rel="noopener noreferrer" className="underline">noJS</a>
                      </span>
                    )}
                  </div>

                  {m.disclosure_info && (
                    <p className="mt-1 text-xs text-gray-400 italic line-clamp-1">ℹ️ {m.disclosure_info}</p>
                  )}
                </div>
                <button onClick={() => handleArchive(m.id)} className="shrink-0 text-xs text-red-500 hover:underline">削除</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab: Categories                                                    */
/* ------------------------------------------------------------------ */

function CategoriesTab({
  categories,
  onRefresh,
}: {
  categories: UserCategory[];
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleAdd() {
    if (!slug.trim() || !title.trim()) {
      setMsg("スラッグとタイトルは必須です");
      return;
    }
    setSaving(true); setMsg(null);

    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: slug.trim(),
        title: title.trim(),
        description: description.trim(),
      }),
    });

    if (res.ok) { setSlug(""); setTitle(""); setDescription(""); setShowForm(false); onRefresh(); }
    else { const json = await res.json(); setMsg(json.error ?? "保存に失敗"); }
    setSaving(false);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">📁 カテゴリ管理</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 sm:text-sm">
          ＋ 新規カテゴリ
        </button>
      </div>

      <p className="mb-3 text-xs text-gray-400">
        デフォルト: AIエンジニア, DTMer, VRクリエイター, 楽器演奏者, 動画クリエイター
      </p>

      {showForm && (
        <div className="mb-4 space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)}
            placeholder="スラッグ (例: pro-gamer) *" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="表示名 (例: プロゲーマーになりたい) *" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="説明文" rows={2} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
              {saving ? "保存中..." : "保存"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300">
              キャンセル
            </button>
          </div>
          {msg && <p className="text-sm text-red-600">{msg}</p>}
        </div>
      )}

      {categories.length === 0 ? (
        <p className="text-sm text-gray-500">ユーザー追加カテゴリはまだありません。</p>
      ) : (
        <ul className="space-y-2">
          {categories.map((c) => (
            <li key={c.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
              <span className="font-semibold text-gray-900">{c.title}</span>
              <code className="ml-2 text-xs text-gray-400">{c.slug}</code>
              {c.description && <p className="mt-1 text-xs text-gray-500">{c.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab: Video Research (Gemini分析 → DeepSeek記事生成)                */
/* ------------------------------------------------------------------ */

function VideoResearchTab({
  aspMaterials,
  onGenerated,
}: {
  aspMaterials: AspMaterial[];
  onGenerated: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [articleTitle, setArticleTitle] = useState("");
  const [videoAUrl, setVideoAUrl] = useState("");
  const [videoBUrl, setVideoBUrl] = useState("");
  const [videoCUrl, setVideoCUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    filename: string; videoCount: number;
  } | null>(null);
  const [category, setCategory] = useState("");
  const [researchFile, setResearchFile] = useState("");
  const [researchFiles, setResearchFiles] = useState<
    Array<{ filename: string; title: string; videoCount: number; generatedAt: string }>
  >([]);
  const [selectedAsps, setSelectedAsps] = useState<string[]>([]);
  const [extraInstructions, setExtraInstructions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error"; text: string; articleId?: string;
  } | null>(null);

  const allCategories = [
    { slug: "ai-engineer", title: "AIエンジニアになりたい" },
    { slug: "dtm", title: "DTMerになりたい" },
    { slug: "vr-creator", title: "VRクリエイターになりたい" },
    { slug: "instrument-player", title: "楽器演奏者になりたい" },
    { slug: "video-creator", title: "動画クリエイターになりたい" },
  ];

  async function loadResearchFiles() {
    const res = await fetch("/api/admin/research-files");
    if (res.ok) setResearchFiles(await res.json());
  }

  async function handleAnalyze() {
    if (!articleTitle.trim() || !videoAUrl.trim()) {
      setResult({ type: "error", text: "タイトルと動画Aは必須です" });
      return;
    }
    setAnalyzing(true); setResult(null);
    const videos = [];
    if (videoAUrl.trim()) videos.push({ url: videoAUrl.trim(), role: "a" as const });
    if (videoBUrl.trim()) videos.push({ url: videoBUrl.trim(), role: "b" as const });
    if (videoCUrl.trim()) videos.push({ url: videoCUrl.trim(), role: "c" as const });

    try {
      const res = await fetch("/api/admin/analyze-videos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: articleTitle.trim(), videos }),
      });
      const json = await res.json();
      if (!res.ok) { setResult({ type: "error", text: json.error ?? "分析失敗" }); return; }
      setAnalysisResult({ filename: json.filename, videoCount: json.videoCount });
      setResearchFile(json.filename);
      await loadResearchFiles();
      setStep(2);
      setResult({ type: "success", text: `✅ Geminiで${json.videoCount}件の動画を分析しました` });
    } catch { setResult({ type: "error", text: "ネットワークエラー" }); }
    finally { setAnalyzing(false); }
  }

  async function handleGenerate() {
    if (!category || !researchFile) {
      setResult({ type: "error", text: "カテゴリとリサーチファイルを選択してください" });
      return;
    }
    setGenerating(true); setResult(null);
    try {
      const res = await fetch("/api/admin/articles/generate-from-research", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: articleTitle.trim(), category, research_filename: researchFile,
          asp_material_ids: selectedAsps,
          extra_instructions: extraInstructions.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setResult({ type: "error", text: json.error ?? "生成失敗" }); return; }
      setResult({ type: "success", text: `✅ 記事生成完了 (${json.tokens_used ?? "?"} tokens)`, articleId: json.article_id });
      setArticleTitle(""); setVideoAUrl(""); setVideoBUrl(""); setVideoCUrl("");
      setExtraInstructions(""); setSelectedAsps([]); setStep(1);
      onGenerated();
    } catch { setResult({ type: "error", text: "ネットワークエラー" }); }
    finally { setGenerating(false); }
  }

  function toggleAsp(id: string) {
    setSelectedAsps((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  const usageLabels: Record<string, string> = {
    recommendation: "おすすめ", comparison: "比較用", tool_intro: "道具紹介",
    budget_option: "予算別", step_up: "次のステップ",
  };

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900">🎬 動画リサーチ → 記事生成</h2>

      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${step === 1 ? "bg-purple-600 text-white" : "bg-green-600 text-white"}`}>1</div>
        <div className={`h-0.5 flex-1 ${step === 2 ? "bg-green-600" : "bg-gray-300"}`} />
        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${step === 2 ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}>2</div>
        <span className="ml-2 text-xs text-gray-500">{step === 1 ? "Gemini動画分析" : "DeepSeek記事生成"}</span>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-4 rounded-lg border border-purple-200 bg-purple-50 p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-purple-900">📹 ステップ1: YouTube動画をGeminiで分析</h3>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">記事タイトル <span className="text-red-500">*</span></label>
            <input type="text" value={articleTitle} onChange={(e) => setArticleTitle(e.target.value)}
              placeholder="例：大人のピアノ練習法" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">動画A（初心者がぶつかる壁） <span className="text-red-500">*</span></label>
            <input type="url" value={videoAUrl} onChange={(e) => setVideoAUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..." className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">動画B（上級者の練習ロジック）</label>
            <input type="url" value={videoBUrl} onChange={(e) => setVideoBUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..." className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">動画C（機材・デバイスレビュー）</label>
            <input type="url" value={videoCUrl} onChange={(e) => setVideoCUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..." className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <p className="text-xs text-gray-400">
            Geminiが動画タイトル・URL・一般知識から内容を推測分析します。正確な分析には <code>npm run analyze:youtube</code> を推奨。
          </p>
          <button onClick={handleAnalyze} disabled={analyzing}
            className="w-full rounded-md bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50">
            {analyzing ? "🔍 Geminiで分析中..." : "🔍 Geminiで動画を分析する"}
          </button>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-4 rounded-lg border border-green-200 bg-green-50 p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-green-900">✍️ ステップ2: DeepSeekで3動画統合記事を生成</h3>
          {analysisResult && (
            <div className="rounded bg-white px-3 py-2 text-sm text-green-700">
              📁 <code>{analysisResult.filename}</code>（{analysisResult.videoCount}動画分析済み）
              <button onClick={() => setStep(1)} className="ml-3 text-xs text-blue-600 underline">← 戻る</button>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">カテゴリ <span className="text-red-500">*</span></label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">選択してください</option>
              {allCategories.map((c) => (<option key={c.slug} value={c.slug}>{c.title}</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">リサーチファイル</label>
            <select value={researchFile} onChange={(e) => setResearchFile(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              {researchFiles.map((f) => (<option key={f.filename} value={f.filename}>{f.title} ({f.videoCount}動画)</option>))}
            </select>
            <button onClick={loadResearchFiles} className="mt-1 text-xs text-blue-600 underline">🔄 更新</button>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">含めるASP素材</label>
            <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2">
              {aspMaterials.map((m) => (
                <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50">
                  <input type="checkbox" checked={selectedAsps.includes(m.id)} onChange={() => toggleAsp(m.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                  <span className="font-medium truncate">{m.name}</span>
                  <span className="text-xs text-gray-400">[{usageLabels[m.usage_type]}]</span>
                  {m.price_note && <span className="text-xs text-green-600">{m.price_note}</span>}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">追加指示</label>
            <textarea value={extraInstructions} onChange={(e) => setExtraInstructions(e.target.value)}
              rows={2} placeholder="例：機材比較表を充実させて" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <button onClick={handleGenerate} disabled={generating}
            className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {generating ? "🚀 DeepSeekで生成中..." : "🚀 DeepSeekで3動画統合記事を生成する"}
          </button>
        </div>
      )}

      {result && (
        <div className={`mt-4 rounded-md px-4 py-3 text-sm ${result.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {result.text}
          {result.articleId && <a href={`/admin/review/${result.articleId}`} className="ml-3 font-medium underline">レビューする →</a>}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab: Review Queue                                                  */
/* ------------------------------------------------------------------ */

function ReviewTab({
  articles,
  onRefresh,
}: {
  articles: Article[];
  onRefresh: () => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          ⏳ レビュー待ち <span className="text-sm font-normal text-gray-400">({articles.length}件)</span>
        </h2>
        <button onClick={onRefresh}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200">
          🔄 更新
        </button>
      </div>

      {articles.length === 0 ? (
        <p className="text-sm text-gray-500">レビュー待ちの記事はありません。</p>
      ) : (
        <ul className="space-y-2">
          {articles.map((a) => (
            <li key={a.id}>
              <a href={`/admin/review/${a.id}`}
                className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:border-yellow-400 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-900">{a.title}</span>
                  <span className="ml-2 text-xs text-gray-500">[{a.category}]</span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(a.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
