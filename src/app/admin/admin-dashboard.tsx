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
  const [stats, setStats] = useState(initialStats);

  /* refresh helpers */
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

  // Refresh all data on mount and tab switch
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
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
        <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
          🛠️ Wanna Navi 管理画面
        </h1>
      </header>

      {/* Tab bar */}
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

      {/* Tab content */}
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {tab === "overview" && (
          <OverviewTab stats={stats} pendingCount={pending.length} />
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
  const [selectedAsps, setSelectedAsps] = useState<string[]>([]);
  const [extraInstructions, setExtraInstructions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    text: string;
    articleId?: string;
  } | null>(null);

  // Combine hardcoded + user categories
  const allCategories = [
    { slug: "ai-engineer", title: "AIエンジニアになりたい" },
    { slug: "dtm", title: "DTMerになりたい" },
    { slug: "vr-creator", title: "VRクリエイターになりたい" },
    { slug: "instrument-player", title: "楽器演奏者になりたい" },
    { slug: "video-creator", title: "動画クリエイターになりたい" },
    ...categories.map((c) => ({ slug: c.slug, title: c.title })),
  ];

  function toggleAsp(id: string) {
    setSelectedAsps((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleGenerate() {
    if (!title.trim()) {
      setResult({ type: "error", text: "タイトルを入力してください" });
      return;
    }
    if (!category) {
      setResult({ type: "error", text: "カテゴリを選択してください" });
      return;
    }

    setGenerating(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/articles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          asp_material_ids: selectedAsps,
          extra_instructions: extraInstructions.trim() || undefined,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setResult({ type: "error", text: json.error ?? "生成に失敗しました" });
        return;
      }

      setResult({
        type: "success",
        text: `✅ 記事を生成しました！ (${json.tokens_used ?? "?"} tokens)`,
        articleId: json.article_id,
      });

      // Reset form
      setTitle("");
      setExtraInstructions("");
      setSelectedAsps([]);
      onGenerated();
    } catch {
      setResult({ type: "error", text: "ネットワークエラー" });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        ✍️ アフィリエイト記事の自動生成依頼
      </h2>

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
        {/* Title */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            記事タイトル <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：大人のピアノ練習法 初心者でも3ヶ月で弾けるようになる秘訣"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Category */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            カテゴリ <span className="text-red-500">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">選択してください</option>
            {allCategories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        {/* ASP materials */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            含めるASP素材 <span className="text-xs text-gray-400">（任意・複数選択）</span>
          </label>
          {aspMaterials.length === 0 ? (
            <p className="text-xs text-gray-400">
              ASP素材がまだ登録されていません。「ASP素材」タブから追加してください。
            </p>
          ) : (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2">
              {aspMaterials.map((m) => (
                <label
                  key={m.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedAsps.includes(m.id)}
                    onChange={() => toggleAsp(m.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <span>
                    <span className="font-medium">{m.name}</span>
                    <span className="ml-1 text-xs text-gray-400">[{m.asp_name}]</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Extra instructions */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            追加指示 <span className="text-xs text-gray-400">（任意）</span>
          </label>
          <textarea
            value={extraInstructions}
            onChange={(e) => setExtraInstructions(e.target.value)}
            rows={3}
            placeholder="例：読者ターゲットは40代男性、導入では昔諦めた経験に共感させる、比較表は不要"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              DeepSeekで生成中...（30秒ほどかかります）
            </span>
          ) : (
            "🚀 DeepSeekで記事を生成する"
          )}
        </button>

        {/* Result */}
        {result && (
          <div
            className={`rounded-md px-4 py-3 text-sm ${
              result.type === "success"
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {result.text}
            {result.articleId && (
              <a
                href={`/admin/review/${result.articleId}`}
                className="ml-3 font-medium underline"
              >
                レビューする →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab: ASP Materials                                                 */
/* ------------------------------------------------------------------ */

function AspMaterialsTab({
  materials,
  onRefresh,
}: {
  materials: AspMaterial[];
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [aspName, setAspName] = useState("");
  const [description, setDescription] = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [priceNote, setPriceNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleAdd() {
    if (!name.trim() || !aspName.trim()) {
      setMsg("名前とASP名は必須です");
      return;
    }
    setSaving(true);
    setMsg(null);

    const res = await fetch("/api/admin/asp-materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        asp_name: aspName.trim(),
        description: description.trim(),
        affiliate_url: affiliateUrl.trim() || null,
        price_note: priceNote.trim() || null,
      }),
    });

    if (res.ok) {
      setName("");
      setAspName("");
      setDescription("");
      setAffiliateUrl("");
      setPriceNote("");
      setShowForm(false);
      onRefresh();
    } else {
      const json = await res.json();
      setMsg(json.error ?? "保存に失敗");
    }
    setSaving(false);
  }

  async function handleArchive(id: string) {
    await fetch("/api/admin/asp-materials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "archived" }),
    });
    onRefresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          🔗 ASP素材一覧 <span className="text-sm font-normal text-gray-400">({materials.length}件)</span>
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 sm:text-sm"
        >
          ＋ 新規追加
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-4 space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="商品/サービス名 *"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={aspName}
            onChange={(e) => setAspName(e.target.value)}
            placeholder="ASP名 (例: A8.net, もしもアフィリエイト) *"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="商品説明・おすすめポイント"
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="url"
            value={affiliateUrl}
            onChange={(e) => setAffiliateUrl(e.target.value)}
            placeholder="アフィリエイトURL"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={priceNote}
            onChange={(e) => setPriceNote(e.target.value)}
            placeholder="価格帯 (例: ¥5,000〜)"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
            >
              キャンセル
            </button>
          </div>
          {msg && <p className="text-sm text-red-600">{msg}</p>}
        </div>
      )}

      {/* List */}
      {materials.length === 0 ? (
        <p className="text-sm text-gray-500">
          まだASP素材が登録されていません。「新規追加」から気に入ったASP素材を放り込んでください。
        </p>
      ) : (
        <ul className="space-y-2">
          {materials.map((m) => (
            <li
              key={m.id}
              className="rounded-lg border border-gray-200 bg-white p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-semibold text-gray-900">{m.name}</span>
                  <span className="ml-2 text-xs text-gray-400">[{m.asp_name}]</span>
                  {m.price_note && (
                    <span className="ml-2 text-xs text-green-600">{m.price_note}</span>
                  )}
                </div>
                <button
                  onClick={() => handleArchive(m.id)}
                  className="shrink-0 text-xs text-red-500 hover:underline"
                >
                  削除
                </button>
              </div>
              {m.description && (
                <p className="mt-1 text-xs text-gray-500">{m.description}</p>
              )}
              {m.affiliate_url && (
                <a
                  href={m.affiliate_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block truncate text-xs text-blue-500 underline"
                >
                  {m.affiliate_url}
                </a>
              )}
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
    setSaving(true);
    setMsg(null);

    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: slug.trim(),
        title: title.trim(),
        description: description.trim(),
      }),
    });

    if (res.ok) {
      setSlug("");
      setTitle("");
      setDescription("");
      setShowForm(false);
      onRefresh();
    } else {
      const json = await res.json();
      setMsg(json.error ?? "保存に失敗");
    }
    setSaving(false);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">📁 カテゴリ管理</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 sm:text-sm"
        >
          ＋ 新規カテゴリ
        </button>
      </div>

      {/* Hardcoded categories info */}
      <p className="mb-3 text-xs text-gray-400">
        デフォルトカテゴリ: AIエンジニア, DTMer, VRクリエイター, 楽器演奏者, 動画クリエイター
      </p>

      {showForm && (
        <div className="mb-4 space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="スラッグ (例: pro-gamer) *"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="表示名 (例: プロゲーマーになりたい) *"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="説明文"
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
            >
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
            <li
              key={c.id}
              className="rounded-lg border border-gray-200 bg-white p-3 text-sm"
            >
              <span className="font-semibold text-gray-900">{c.title}</span>
              <code className="ml-2 text-xs text-gray-400">{c.slug}</code>
              {c.description && (
                <p className="mt-1 text-xs text-gray-500">{c.description}</p>
              )}
            </li>
          ))}
        </ul>
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
        <button
          onClick={onRefresh}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200"
        >
          🔄 更新
        </button>
      </div>

      {articles.length === 0 ? (
        <p className="text-sm text-gray-500">レビュー待ちの記事はありません。</p>
      ) : (
        <ul className="space-y-2">
          {articles.map((a) => (
            <li key={a.id}>
              <a
                href={`/admin/review/${a.id}`}
                className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:border-yellow-400 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {a.title}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">[{a.category}]</span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(a.created_at).toLocaleString("ja-JP", {
                    timeZone: "Asia/Tokyo",
                  })}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
