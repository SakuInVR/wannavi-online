"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { SubInfo } from "@/components/SubInfo";

interface Article {
  id: string;
  title: string;
  category: string;
  review_status: string;
  pipeline_state: string;
  slug: string;
  created_at: string;
  free_retake_used: boolean;
  body?: string;
  is_private?: boolean;
}

interface ProjectStep {
  step_index: number;
  status: "todo" | "doing" | "done";
  target_date: string | null;
  memo: string;
}

interface UserProject {
  id: string;
  article_id: string;
  status: "in_progress" | "completed";
  created_at: string;
  updated_at: string;
  articles: {
    title: string;
    slug: string;
    category: string;
  } | null;
  steps: ProjectStep[];
  progress: number;
}

interface ChatMessage {
  sender: "user" | "assistant";
  content: string;
  created_at?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = getSupabase();

  // Core User & Auth States
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("free");
  const [loading, setLoading] = useState(true);

  // Core Data States
  const [articles, setArticles] = useState<Article[]>([]);
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [unlockedArticleIds, setUnlockedArticleIds] = useState<Set<string>>(new Set());

  // Interactivity / Modals
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [retakeOpen, setRetakeOpen] = useState(false);
  const [retakeInstructions, setRetakeInstructions] = useState("");
  const [pricingOpen, setPricingOpen] = useState(false);
  const [isPublishPrivate, setIsPublishPrivate] = useState(false);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [mockLoading, setMockLoading] = useState(false);
  const [projectActionLoading, setProjectActionLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"projects" | "roadmaps">("projects");

  // Project Step Edit states
  const [editingMemoStep, setEditingMemoStep] = useState<{ projectId: string; stepIndex: number } | null>(null);
  const [memoInput, setMemoInput] = useState("");
  const [savingStepIndex, setSavingStepIndex] = useState<number | null>(null);

  // AI Mentor Chat Drawer states
  const [chatOpen, setChatOpen] = useState(false);
  const [activeChatProject, setActiveChatProject] = useState<UserProject | null>(null);
  const [activeChatStepIndex, setActiveChatStepIndex] = useState<number>(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    if (selectedArticle) {
      setIsPublishPrivate(!!selectedArticle.is_private);
    }
  }, [selectedArticle]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, chatOpen, chatLoading]);

  // Fetch initial profile, articles, projects, unlocks
  const fetchAllData = async (uid: string) => {
    if (!supabase) return;

    try {
      // 1. Profile & Subscription
      const { data: profile } = await supabase
        .from("profiles")
        .select("credits, subscription_status")
        .eq("id", uid)
        .single();
      
      if (profile) {
        setCredits(profile.credits ?? 0);
        setSubscriptionStatus(profile.subscription_status ?? "free");
      }

      // 2. Unlocks
      const { data: unlocks } = await supabase
        .from("article_unlocks")
        .select("article_id")
        .eq("user_id", uid);
      
      if (unlocks) {
        setUnlockedArticleIds(new Set(unlocks.map((u: any) => u.article_id)));
      }

      // 3. User Roadmaps (generated roadmaps)
      const { data: userArticles } = await supabase
        .from("articles")
        .select("id, title, category, review_status, pipeline_state, slug, created_at, free_retake_used, body, is_private")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (userArticles) {
        setArticles(userArticles);
      }

      // 4. Learning Projects (SaaS)
      const res = await fetch("/api/projects", {
        headers: {
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      const projData = await res.json();
      if (res.ok && projData.projects) {
        setProjects(projData.projects);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const checkAuthAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login?redirectTo=/dashboard");
        return;
      }
      setUser(session.user);
      await fetchAllData(session.user.id);
      setLoading(false);
    };

    checkAuthAndFetch();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.push("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  // Project Creation (POST)
  const handleStartProject = async (articleId: string) => {
    if (!supabase || !user) return;
    setProjectActionLoading(articleId);
    setStatusMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ articleId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage("🎯 学習プロジェクトを新しく開始しました！ダッシュボードで進めましょう。");
        await fetchAllData(user.id);
        setActiveTab("projects");
      } else {
        setStatusMessage(data.message || data.error || "プロジェクトの作成に失敗しました。");
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("通信エラーが発生しました。");
    } finally {
      setProjectActionLoading(null);
    }
  };

  // Step Updates (PATCH)
  const handleUpdateStepField = async (
    projectId: string,
    stepIndex: number,
    fields: { status?: "todo" | "doing" | "done"; targetDate?: string | null; memo?: string }
  ) => {
    if (!supabase || !user) return;
    setSavingStepIndex(stepIndex);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/projects/${projectId}/steps`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          stepIndex,
          status: fields.status,
          targetDate: fields.targetDate,
          memo: fields.memo,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Optimistically update local project steps state to prevent full reload flicker
        setProjects((prev) =>
          prev.map((proj) => {
            if (proj.id !== projectId) return proj;
            const updatedSteps = proj.steps.map((st) => {
              if (st.step_index !== stepIndex) return st;
              return {
                ...st,
                status: fields.status !== undefined ? fields.status : st.status,
                target_date: fields.targetDate !== undefined ? fields.targetDate : st.target_date,
                memo: fields.memo !== undefined ? fields.memo : st.memo,
              };
            });
            const completed = updatedSteps.filter((s) => s.status === "done").length;
            const progress = Math.round((completed / updatedSteps.length) * 100);
            return {
              ...proj,
              steps: updatedSteps,
              progress,
              status: data.projectStatus,
            };
          })
        );
      } else {
        setStatusMessage(data.error || "ステップの保存に失敗しました。");
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("通信エラーが発生しました。");
    } finally {
      setSavingStepIndex(null);
    }
  };

  // AI Mentor Chat initiation
  const handleOpenChat = async (project: UserProject, stepIndex: number) => {
    if (!supabase || !user) return;
    setActiveChatProject(project);
    setActiveChatStepIndex(stepIndex);
    setChatMessages([]);
    setChatOpen(true);
    setChatLoading(true);

    try {
      // Direct client fetch for chat messages under project and step (safely restricted by RLS)
      const { data: messages, error } = await supabase
        .from("project_messages")
        .select("sender, content")
        .eq("project_id", project.id)
        .eq("step_index", stepIndex)
        .order("created_at", { ascending: true });

      if (!error && messages) {
        setChatMessages(messages.map((m) => ({ sender: m.sender as any, content: m.content })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  // AI Mentor Send Message
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading || !activeChatProject || !supabase || !user) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { sender: "user", content: userMsg }]);
    setChatLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/projects/${activeChatProject.id}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          stepIndex: activeChatStepIndex,
          message: userMsg,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setChatMessages((prev) => [...prev, { sender: "assistant", content: data.reply }]);
        setCredits(data.remainingCredits);
      } else {
        setChatMessages((prev) => [
          ...prev,
          { sender: "assistant", content: `❌ エラー: ${data.message || data.error || "応答の取得に失敗しました。"}` },
        ]);
      }
    } catch (err) {
      console.error(err);
      setChatMessages((prev) => [
        ...prev,
        { sender: "assistant", content: "❌ 通信エラーが発生しました。インターネット接続を確認してください。" },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Stripe Checkout Sessions
  const handlePurchase = async (creditsCount: number = 10) => {
    if (!supabase || !user) return;
    setPurchaseLoading(true);
    setStatusMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/payments/checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ credits: creditsCount }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setStatusMessage(`決済エラー: ${data.error || "接続失敗"}`);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("Stripe決済の初期化に失敗しました。");
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleSubscribePro = async () => {
    if (!supabase || !user) return;
    setPurchaseLoading(true);
    setStatusMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/payments/checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ plan: "pro" }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setStatusMessage(`決済エラー: ${data.error || "接続失敗"}`);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("Stripeサブスクリプションの初期化に失敗しました。");
    } finally {
      setPurchaseLoading(false);
    }
  };

  // Mock Purchase (Dev Only)
  const handleMockPayment = async () => {
    if (!supabase || !user) return;
    setMockLoading(true);
    setStatusMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/payments/mock-success", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage("【デバッグ】10クレジットを即時追加しました！");
        await fetchAllData(user.id);
      } else {
        setStatusMessage(`Mock決済エラー: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("Mock決済エラーが発生しました。");
    } finally {
      setMockLoading(false);
    }
  };

  // Roadmap Unlocking
  const handleUnlockArticle = async (articleId: string) => {
    if (!supabase || !user) return;
    setActionLoading(true);
    setStatusMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/articles/${articleId}/unlock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage("ロードマップ全体をアンロックしました！プロジェクトを開始できます。");
        await fetchAllData(user.id);
      } else {
        setStatusMessage(`アンロックエラー: ${data.error || "失敗しました"}`);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("アンロック処理中に通信エラーが発生しました。");
    } finally {
      setActionLoading(false);
    }
  };

  // Publish Roadmap
  const handlePublish = async (articleId: string, isPrivate: boolean) => {
    if (!supabase || !user) return;
    setActionLoading(true);
    setStatusMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/articles/${articleId}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ is_private: isPrivate }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage("記事を本番公開しました！");
        await fetchAllData(user.id);
        setPreviewOpen(false);
        setSelectedArticle(null);
      } else {
        setStatusMessage(`公開エラー: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("公開処理中にエラーが発生しました。");
    } finally {
      setActionLoading(false);
    }
  };

  // Retake Roadmap
  const handleRetakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !user || !selectedArticle) return;

    setActionLoading(true);
    setStatusMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/articles/${selectedArticle.id}/retake`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          retake_instructions: retakeInstructions,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage(data.message || "リテイクが完了しました！");
        setRetakeInstructions("");
        setRetakeOpen(false);
        setPreviewOpen(false);
        setSelectedArticle(null);
        await fetchAllData(user.id);
      } else {
        setStatusMessage(`リテイクエラー: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("リテイク中に通信エラーが発生しました。");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-slate-950 text-white">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        <p className="mt-4 text-sm font-bold text-slate-400">ラーニングハブを構築中...</p>
      </div>
    );
  }

  const drafts = articles.filter(a => a.review_status !== "approved" || a.pipeline_state !== "published");
  const publishedRoadmaps = articles.filter(a => a.review_status === "approved" && a.pipeline_state === "published");
  
  // Stats calculation for SubInfo and dashboard badges
  const completedProjectsCount = projects.filter(p => p.status === "completed").length;
  const isPro = subscriptionStatus === "active" || subscriptionStatus === "pro";

  return (
    <div className="min-h-screen bg-slate-900 pb-20 text-white">
      {/* ── Header Status Banner ── */}
      <section className="bg-slate-950 px-6 py-10 border-b border-white/5 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-1/4 h-56 w-56 rounded-full bg-sky-500/5 blur-3xl" />
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
              <p className="text-xs font-bold text-sky-400 uppercase tracking-widest">AI Learning SaaS Hub</p>
            </div>
            <h1 className="text-3xl font-black tracking-tight mt-1">ラーニングコントロールハブ</h1>
            <p className="mt-1.5 text-xs text-slate-400">
              アカウント: <span className="font-semibold text-slate-200">{user?.email}</span>
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* Credit Card */}
            <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 flex items-center gap-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">クレジット残高</p>
                <p className="text-2xl font-black text-sky-400 mt-0.5">
                  {isPro ? "∞" : credits} <span className="text-xs text-white font-medium">{isPro ? "使い放題" : "回分"}</span>
                </p>
              </div>
              {!isPro && (
                <button
                  onClick={() => setPricingOpen(true)}
                  className="rounded-lg bg-sky-500 hover:bg-sky-600 transition text-xs font-black px-3.5 py-2 text-white shadow-md shadow-sky-500/10 cursor-pointer"
                >
                  チャージ
                </button>
              )}
            </div>

            {isDev && (
              <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-center gap-3">
                <div className="text-slate-400 text-[10px]">
                  <span className="font-bold text-amber-400 block">Dev Mode</span>
                  テスト用
                </div>
                <button
                  onClick={handleMockPayment}
                  disabled={mockLoading}
                  className="rounded-lg bg-amber-500 hover:bg-amber-600 transition text-xs font-black px-3 py-1.5 text-slate-950 cursor-pointer disabled:opacity-50"
                >
                  {mockLoading ? "Wait..." : "+10C"}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Main Layout ── */}
      <main className="mx-auto max-w-6xl px-6 mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Status notification */}
        {statusMessage && (
          <div className="lg:col-span-12 rounded-xl bg-sky-500/10 border border-sky-500/20 p-4 text-sm text-sky-400 font-semibold flex justify-between items-center shadow-lg backdrop-blur-sm">
            <span>{statusMessage}</span>
            <button onClick={() => setStatusMessage("")} className="text-slate-400 hover:text-white text-lg">✕</button>
          </div>
        )}

        {/* LEFT COLUMN: Main Hub Control */}
        <div className="lg:col-span-8 space-y-6">
          {/* Navigation Tab */}
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("projects")}
                className={`px-4 py-2 text-sm font-black transition relative cursor-pointer ${
                  activeTab === "projects" ? "text-white" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                🎯 マイ・プロジェクト ({projects.length})
                {activeTab === "projects" && (
                  <span className="absolute bottom-0 inset-x-0 h-0.5 bg-sky-500" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("roadmaps")}
                className={`px-4 py-2 text-sm font-black transition relative cursor-pointer ${
                  activeTab === "roadmaps" ? "text-white" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                🗺️ 生成したロードマップ ({articles.length})
                {activeTab === "roadmaps" && (
                  <span className="absolute bottom-0 inset-x-0 h-0.5 bg-sky-500" />
                )}
              </button>
            </div>
            
            <Link
              href="/generate"
              className="rounded-full bg-white text-slate-950 px-4 py-2 text-xs font-black hover:bg-sky-100 transition flex items-center gap-1 shadow-md shadow-white/5"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              AI新規生成
            </Link>
          </div>

          {/* TAB 1: SaaS PROJECTS LIST */}
          {activeTab === "projects" && (
            <div className="space-y-6">
              {projects.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl bg-slate-950/20">
                  <span className="text-4xl">🎯</span>
                  <h3 className="text-lg font-bold text-slate-300 mt-4">進行中の学習プロジェクトはありません。</h3>
                  <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                    アンロック済みのロードマップから「学習プロジェクトを開始する」をクリックすると、ここに進捗管理ボードが立ち上がります。
                  </p>
                  <button
                    onClick={() => setActiveTab("roadmaps")}
                    className="mt-6 rounded-lg bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 px-5 py-2 text-xs font-black text-sky-400 cursor-pointer transition"
                  >
                    生成したロードマップから開始する →
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="rounded-2xl border border-white/5 bg-slate-950/60 p-6 shadow-xl backdrop-blur-md"
                    >
                      {/* Project Header */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-white/5">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 text-[9px] font-black text-sky-400">
                              {project.articles?.category || "学習"}
                            </span>
                            {project.status === "completed" ? (
                              <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-black text-emerald-400 flex items-center gap-0.5">
                                ✓ 完了
                              </span>
                            ) : (
                              <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[9px] font-black text-amber-400 animate-pulse">
                                ● 進行中
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-black text-slate-200 mt-2">{project.articles?.title}</h3>
                        </div>

                        {/* Progress rate gauge */}
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">達成率</span>
                            <span className="text-lg font-black text-sky-400">{project.progress}%</span>
                          </div>
                          <div className="h-10 w-10 rounded-full border-2 border-white/5 flex items-center justify-center relative overflow-hidden bg-white/5">
                            {/* Simple circular background progress fill effect using Tailwind */}
                            <div className="absolute inset-0 bg-sky-500/10 transition-all duration-500" style={{ height: `${project.progress}%`, bottom: 0 }} />
                            <span className="text-[9px] font-black text-slate-300 relative z-10">✓</span>
                          </div>
                        </div>
                      </div>

                      {/* Steps Progress Checklist */}
                      <div className="mt-6 space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">カリキュラム・チェックリスト</p>
                        
                        {project.steps.map((step, idx) => {
                          const isEditingMemo = editingMemoStep?.projectId === project.id && editingMemoStep?.stepIndex === idx;

                          return (
                            <div
                              key={idx}
                              className={`rounded-xl border p-4 transition-all ${
                                step.status === "done"
                                  ? "border-emerald-500/10 bg-emerald-500/5 text-slate-300"
                                  : step.status === "doing"
                                  ? "border-sky-500/15 bg-sky-500/5 text-slate-200"
                                  : "border-white/5 bg-white/5 text-slate-400"
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div className="flex items-start gap-3">
                                  {/* Step Index Checkbox */}
                                  <button
                                    onClick={() => {
                                      const nextStatus = step.status === "done" ? "todo" : step.status === "doing" ? "done" : "doing";
                                      handleUpdateStepField(project.id, idx, { status: nextStatus });
                                    }}
                                    disabled={savingStepIndex === idx}
                                    className={`h-5 w-5 shrink-0 rounded border flex items-center justify-center text-xs font-black transition cursor-pointer ${
                                      step.status === "done"
                                        ? "bg-emerald-500 border-emerald-500 text-white"
                                        : step.status === "doing"
                                        ? "bg-sky-500 border-sky-500 text-white"
                                        : "border-white/20 bg-slate-900 text-transparent hover:border-white/40"
                                    }`}
                                  >
                                    {step.status === "done" ? "✓" : step.status === "doing" ? "⚡" : ""}
                                  </button>

                                  <div>
                                    <h4 className="text-xs font-black flex items-center gap-1.5">
                                      <span>ステップ {idx + 1}</span>
                                      {step.status === "done" && (
                                        <span className="text-[9px] font-bold text-emerald-400">(完了)</span>
                                      )}
                                      {step.status === "doing" && (
                                        <span className="text-[9px] font-bold text-sky-400">(実践中)</span>
                                      )}
                                    </h4>
                                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                                      {idx === 0 && "基礎インプットと環境構築"}
                                      {idx === 1 && "チュートリアルの実装と基礎習得"}
                                      {idx === 2 && "応用実践と自力プロダクトの要件定義"}
                                      {idx === 3 && "オリジナル成果物・作品の制作とデプロイ/公開"}
                                      {idx === 4 && "自律学習の環境整備と習慣化"}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-center">
                                  {/* Target Date Selector */}
                                  <div className="flex items-center gap-1 bg-white/5 border border-white/5 px-2 py-1 rounded text-[10px]">
                                    <span className="text-slate-500">📅</span>
                                    <input
                                      type="date"
                                      value={step.target_date ? step.target_date.substring(0, 10) : ""}
                                      onChange={(e) => {
                                        const dateVal = e.target.value || null;
                                        handleUpdateStepField(project.id, idx, { targetDate: dateVal });
                                      }}
                                      className="bg-transparent border-none text-slate-300 focus:outline-none cursor-pointer"
                                    />
                                  </div>

                                  {/* AI Mentor Trigger */}
                                  <button
                                    onClick={() => handleOpenChat(project, idx)}
                                    className="rounded-lg bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 text-sky-400 px-2.5 py-1.5 text-[10px] font-black cursor-pointer transition flex items-center gap-1"
                                  >
                                    🤖 AIメンター
                                  </button>
                                </div>
                              </div>

                              {/* Memo Area */}
                              <div className="mt-3 pt-3 border-t border-white/5 flex flex-col gap-2">
                                {isEditingMemo ? (
                                  <div className="flex gap-2">
                                    <textarea
                                      value={memoInput}
                                      onChange={(e) => setMemoInput(e.target.value)}
                                      className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                                      placeholder="学習記録、エラーメモ、実装内容などを自由に記入できます..."
                                      rows={2}
                                    />
                                    <div className="flex flex-col gap-1.5 justify-end">
                                      <button
                                        onClick={async () => {
                                          await handleUpdateStepField(project.id, idx, { memo: memoInput });
                                          setEditingMemoStep(null);
                                        }}
                                        className="rounded bg-sky-500 text-white font-black px-2.5 py-1.5 text-[9px] hover:bg-sky-600 transition cursor-pointer"
                                      >
                                        保存
                                      </button>
                                      <button
                                        onClick={() => setEditingMemoStep(null)}
                                        className="rounded bg-white/10 text-slate-400 font-bold px-2.5 py-1.5 text-[9px] hover:bg-white/20 transition cursor-pointer"
                                      >
                                        閉じる
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-start gap-4">
                                    <p className="text-[10px] leading-relaxed text-slate-400 font-sans whitespace-pre-wrap italic">
                                      {step.memo ? `📝 学習メモ: ${step.memo}` : "📝 学習記録やエラー履歴などをここに記録できます。"}
                                    </p>
                                    <button
                                      onClick={() => {
                                        setEditingMemoStep({ projectId: project.id, stepIndex: idx });
                                        setMemoInput(step.memo);
                                      }}
                                      className="text-[9px] font-black text-slate-500 hover:text-white transition shrink-0 cursor-pointer"
                                    >
                                      {step.memo ? "編集" : "メモを書く"}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GENERATED ROADMAPS */}
          {activeTab === "roadmaps" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Draft Section */}
              <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-black text-slate-100 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    未公開 / 生成下書き ({drafts.length})
                  </h3>
                </div>

                {drafts.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-white/10 rounded-xl">
                    <p className="text-xs text-slate-500 font-bold">下書き中のロードマップはありません。</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {drafts.map((art) => {
                      const isUnlocked = unlockedArticleIds.has(art.id);
                      const hasProject = projects.some((p) => p.article_id === art.id);

                      return (
                        <div key={art.id} className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col justify-between gap-4">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[9px] font-black text-amber-400">
                                {art.category}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {art.is_private ? (
                                  <span className="rounded bg-slate-500/10 border border-slate-500/20 px-1.5 py-0.5 text-[9px] font-black text-slate-400">
                                    🔒 自分専用
                                  </span>
                                ) : (
                                  <span className="rounded bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 text-[9px] font-black text-sky-400">
                                    🌐 全体公開
                                  </span>
                                )}
                              </div>
                            </div>
                            <h4 className="font-black text-slate-200 mt-2 text-xs leading-snug">{art.title}</h4>
                          </div>

                          <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-white/5">
                            <button
                              onClick={() => {
                                setSelectedArticle(art);
                                setPreviewOpen(true);
                              }}
                              className="rounded bg-white/10 hover:bg-white/20 px-3 py-1.5 text-[10px] font-black text-white cursor-pointer transition"
                            >
                              {isUnlocked ? "プレビュー・公開" : "前半プレビューを確認"}
                            </button>
                            
                            {isUnlocked ? (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedArticle(art);
                                    setRetakeInstructions("");
                                    setRetakeOpen(true);
                                  }}
                                  className="rounded bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 px-3 py-1.5 text-[10px] font-black text-sky-400 cursor-pointer transition"
                                >
                                  リテイク
                                </button>
                                <button
                                  onClick={() => handleStartProject(art.id)}
                                  disabled={projectActionLoading === art.id || hasProject}
                                  className="rounded bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 text-[10px] font-black text-white cursor-pointer transition disabled:opacity-50"
                                >
                                  {projectActionLoading === art.id
                                    ? "処理中..."
                                    : hasProject
                                    ? "プロジェクト進行中"
                                    : "🚀 プロジェクト開始"}
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleUnlockArticle(art.id)}
                                disabled={actionLoading}
                                className="rounded bg-sky-500 hover:bg-sky-600 px-3 py-1.5 text-[10px] font-black text-white cursor-pointer transition flex items-center gap-1 disabled:opacity-50"
                              >
                                🔓 アンロック (1C)
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Published Roadmaps Section */}
              <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="font-black text-slate-100 flex items-center gap-2 mb-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  全体公開済み ({publishedRoadmaps.length})
                </h3>

                {publishedRoadmaps.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-white/10 rounded-xl">
                    <p className="text-xs text-slate-500 font-bold">一般公開中のロードマップはありません。</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {publishedRoadmaps.map((art) => {
                      const hasProject = projects.some((p) => p.article_id === art.id);

                      return (
                        <div key={art.id} className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col justify-between gap-4">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-black text-emerald-400">
                                {art.category}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {art.is_private ? (
                                  <span className="rounded bg-slate-500/10 border border-slate-500/20 px-1.5 py-0.5 text-[9px] font-black text-slate-400">
                                    🔒 自分専用
                                  </span>
                                ) : (
                                  <span className="rounded bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 text-[9px] font-black text-sky-400">
                                    🌐 全体公開
                                  </span>
                                )}
                              </div>
                            </div>
                            <h4 className="font-black text-slate-200 mt-2 text-xs leading-snug">{art.title}</h4>
                          </div>

                          <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
                            <button
                              onClick={() => handleStartProject(art.id)}
                              disabled={projectActionLoading === art.id || hasProject}
                              className="rounded bg-sky-500 hover:bg-sky-600 px-3 py-1.5 text-[10px] font-black text-white cursor-pointer transition disabled:opacity-50"
                            >
                              {projectActionLoading === art.id
                                ? "処理中..."
                                : hasProject
                                ? "プロジェクト進行中"
                                : "🚀 プロジェクト開始"}
                            </button>
                            <Link
                              href={`/articles/${art.slug}`}
                              target="_blank"
                              className="rounded bg-white/10 hover:bg-white/20 px-3 py-1.5 text-[10px] font-black text-slate-300 transition flex items-center gap-0.5"
                            >
                              記事 ↗
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Subscriptions & Achievements (SubInfo) */}
        <div className="lg:col-span-4 space-y-6">
          <SubInfo
            subscriptionStatus={subscriptionStatus}
            credits={credits}
            completedCount={completedProjectsCount}
            chatCount={0} // Optimistic, calculated in component achievements check
            onSubscribe={handleSubscribePro}
            loading={purchaseLoading}
          />
        </div>
      </main>

      {/* ── Chat Drawer Sidebar Overlay (AI Mentor Chat) ── */}
      {chatOpen && activeChatProject && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          {/* Backdrop Closer */}
          <div className="absolute inset-0 cursor-pointer" onClick={() => setChatOpen(false)} />
          
          <div className="relative w-full max-w-md h-full bg-slate-950 border-l border-white/5 shadow-2xl flex flex-col z-10">
            {/* Drawer Header */}
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-slate-950">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <div>
                  <h3 className="font-black text-sm text-slate-200">AIラーニングメンター</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-none">
                    ステップ {activeChatStepIndex + 1} 特化サポート
                  </p>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-900/50">
              {chatMessages.length === 0 && !chatLoading && (
                <div className="text-center py-12 text-slate-500 flex flex-col items-center gap-2">
                  <span className="text-3xl">👋</span>
                  <p className="text-xs font-bold">AIメンターが常駐しています。</p>
                  <p className="text-[10px] max-w-[250px] mx-auto leading-relaxed text-slate-600">
                    現在の学習ステップの進め方、必要な教材の選び方、技術的なエラーなど、なんでも相談してください。
                  </p>
                </div>
              )}

              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed font-sans ${
                      msg.sender === "user"
                        ? "bg-sky-500 text-white rounded-tr-none"
                        : "bg-slate-950 border border-white/5 text-slate-300 rounded-tl-none whitespace-pre-wrap"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-950 border border-white/5 text-slate-400 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs flex items-center gap-2">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-sky-500" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-sky-500" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-sky-500" style={{ animationDelay: "300ms" }} />
                    <span className="text-[10px] ml-1">AI思考中...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Credit Info Warning under Free tier */}
            {!isPro && (
              <div className="bg-amber-500/5 border-t border-amber-500/10 px-5 py-2 text-[9px] text-amber-400 flex items-center justify-between">
                <span>⚠️ 無料プラン: 1メッセージ送信で 1C 消費します</span>
                <span>保有クレジット: {credits}C</span>
              </div>
            )}

            {/* Chat Input Footer */}
            <form onSubmit={handleSendChatMessage} className="p-4 border-t border-white/5 bg-slate-950">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatLoading}
                  placeholder="メッセージを入力してください..."
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white px-4 py-3 text-xs font-black transition cursor-pointer"
                >
                  送信
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Preview Modal ── */}
      {previewOpen && selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl border border-white/10 bg-slate-950 p-6 md:p-8 shadow-2xl flex flex-col max-h-[90vh]">
            <button
              onClick={() => {
                setPreviewOpen(false);
                setSelectedArticle(null);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-white text-lg font-black cursor-pointer"
            >
              ✕
            </button>

            <div className="border-b border-white/5 pb-4 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-xs font-black text-amber-400">
                  {selectedArticle.category} ({selectedArticle.review_status === "approved" ? "公開済み" : "下書き"})
                </span>
                {isPublishPrivate ? (
                  <span className="rounded bg-slate-500/10 border border-slate-500/20 px-2.5 py-1 text-xs font-black text-slate-400">
                    🔒 自分専用 (非公開)
                  </span>
                ) : (
                  <span className="rounded bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 text-xs font-black text-sky-400">
                    🌐 全体公開
                  </span>
                )}
              </div>
              <h3 className="text-xl md:text-2xl font-black text-white mt-3 leading-snug">{selectedArticle.title}</h3>
            </div>

            {/* Article Content Viewer */}
            <div className="flex-1 overflow-y-auto bg-slate-900 border border-white/5 rounded-xl p-4 md:p-6 text-sm text-slate-300 leading-relaxed font-sans prose prose-invert max-w-none">
              {(() => {
                const isUnlocked = unlockedArticleIds.has(selectedArticle.id);
                const hasDelimiter = selectedArticle.body?.includes("<!-- PREMIUM_SECTION -->");
                let displayBody = selectedArticle.body || "";

                if (hasDelimiter && !isUnlocked) {
                  displayBody = displayBody.split("<!-- PREMIUM_SECTION -->")[0] + "\n\n*(後半の計画はロックされています。以下からアンロックできます)*";
                } else if (hasDelimiter) {
                  displayBody = displayBody.replace("<!-- PREMIUM_SECTION -->", "\n\n--- [ここからプレミアム領域] ---\n\n");
                }

                return (
                  <>
                    <div className="mb-6 rounded-lg border border-sky-500/20 bg-sky-500/5 p-4 text-xs font-bold text-sky-300">
                      ※ ロードマップの下書きプレビューを表示しています。
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-sm">{displayBody || "（本文が空です）"}</pre>
                    
                    {hasDelimiter && !isUnlocked && (
                      <div className="mt-8 border-t border-white/10 pt-6 text-center">
                        <p className="text-sm font-bold text-slate-300 mb-3">🔒 後半ステップの詳細計画と挫折対策はロックされています</p>
                        <button
                          onClick={async () => {
                            await handleUnlockArticle(selectedArticle.id);
                            if (supabase) {
                              const { data: updatedArt } = await supabase
                                .from("articles")
                                .select("body")
                                .eq("id", selectedArticle.id)
                                .single();
                              if (updatedArt) {
                                setSelectedArticle({ ...selectedArticle, body: updatedArt.body });
                              }
                            }
                          }}
                          disabled={actionLoading}
                          className="rounded-lg bg-sky-500 hover:bg-sky-600 px-6 py-2.5 text-xs font-black text-white transition flex items-center justify-center gap-1.5 mx-auto disabled:opacity-50 cursor-pointer shadow-lg"
                        >
                          {actionLoading ? "処理中..." : "🔓 1クレジットで全体をアンロックする"}
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Actions Footer */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-4 mt-4">
              <div className="text-xs text-slate-500">
                作成日: {new Date(selectedArticle.created_at).toLocaleString()}
              </div>

              <div className="flex gap-4 items-center">
                {unlockedArticleIds.has(selectedArticle.id) && (
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                    <input
                      type="checkbox"
                      checked={isPublishPrivate}
                      onChange={(e) => setIsPublishPrivate(e.target.checked)}
                      className="rounded border-white/10 bg-slate-900 text-sky-500 focus:ring-0 focus:ring-offset-0 h-4 w-4"
                    />
                    自分専用（非公開）にする
                  </label>
                )}

                {unlockedArticleIds.has(selectedArticle.id) && (
                  <button
                    onClick={() => {
                      setRetakeInstructions("");
                      setRetakeOpen(true);
                    }}
                    className="rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 font-bold px-4 py-2 text-xs cursor-pointer hover:bg-sky-500/20 transition"
                  >
                    リテイク (修正指示)
                  </button>
                )}
                <button
                  onClick={() => handlePublish(selectedArticle.id, isPublishPrivate)}
                  disabled={actionLoading || !unlockedArticleIds.has(selectedArticle.id)}
                  className="rounded-lg bg-emerald-500 text-white font-black px-6 py-2 text-xs cursor-pointer hover:bg-emerald-600 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    "本番公開する (GO)"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Retake Dialog Modal ── */}
      {retakeOpen && selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <button
              onClick={() => setRetakeOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white font-black cursor-pointer"
            >
              ✕
            </button>

            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <svg className="h-5 w-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4" />
              </svg>
              記事の修正（リテイク）
            </h3>

            <p className="mt-2 text-xs text-slate-400 leading-normal">
              記事の内容をもっと良くするために修正の指示を出してください。LLMが元の記事をベースに自動で再執筆を行います。
            </p>

            <form onSubmit={handleRetakeSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  指示内容（プロンプト）
                </label>
                <textarea
                  required
                  value={retakeInstructions}
                  onChange={(e) => setRetakeInstructions(e.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 transition text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="例：『初心者向けの文章にして』『おすすめアフィリエイトデバイスをもっと手頃な価格のものに変更して』『もっと具体的な手順を追加して』"
                />
              </div>

              <div className="rounded-lg bg-sky-500/5 border border-sky-500/10 p-3 text-xs leading-normal">
                {selectedArticle.free_retake_used ? (
                  <span className="text-amber-400 font-bold">⚠️ 有料リテイク: 1クレジット消費します。</span>
                ) : (
                  <span className="text-sky-400 font-bold">🎉 無料枠利用可能: クレジットを消費せずに1回修正できます。</span>
                )}
              </div>

              <button
                type="submit"
                disabled={actionLoading || !retakeInstructions.trim()}
                className="w-full rounded-lg bg-sky-500 text-white py-3 text-sm font-black transition hover:bg-sky-600 disabled:opacity-50 flex justify-center items-center gap-2 cursor-pointer"
              >
                {actionLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    記事を再生成中 (約30秒)...
                  </>
                ) : (
                  "修正を実行する"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Pricing Tier Modal ── */}
      {pricingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl rounded-3xl border border-white/10 bg-slate-950 p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setPricingOpen(false)}
              className="absolute right-6 top-6 text-slate-400 hover:text-white text-xl font-black cursor-pointer transition"
            >
              ✕
            </button>

            <div className="text-center max-w-xl mx-auto mb-8">
              <span className="rounded-full bg-sky-500/10 border border-sky-500/30 px-3 py-1 text-xs font-black text-sky-400 uppercase tracking-widest">
                Credit Charge
              </span>
              <h3 className="text-2xl md:text-3xl font-black text-white mt-3 leading-snug">クレジットを追加チャージ</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                作成したロードマップの後半ステップを開示したり、内容に納得がいかない場合の「リテイク（修正指示）」を実行するためにクレジットをチャージできます。
              </p>
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Tier 1: 1 Credit */}
              <div className="relative rounded-2xl border border-white/5 bg-white/5 p-6 flex flex-col justify-between hover:border-white/10 transition">
                <div>
                  <span className="rounded bg-white/10 px-2.5 py-0.5 text-[10px] font-black text-slate-300">
                    お試しプラン
                  </span>
                  <h4 className="text-lg font-black text-white mt-3">1 クレジット</h4>
                  <p className="text-2xl font-black text-white mt-1">¥100</p>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    ロードマップを1記事分だけ今すぐアンロックしてみたい方に最適なお試しプランです。
                  </p>
                </div>
                <button
                  onClick={() => {
                    setPricingOpen(false);
                    handlePurchase(1);
                  }}
                  disabled={purchaseLoading}
                  className="mt-6 w-full rounded-xl bg-white/10 hover:bg-white/20 text-white py-3 text-xs font-black transition cursor-pointer disabled:opacity-50"
                >
                  {purchaseLoading ? "処理中..." : "1回分購入する"}
                </button>
              </div>

              {/* Tier 2: 10 Credits */}
              <div className="relative rounded-2xl border-2 border-sky-500 bg-sky-500/5 p-6 flex flex-col justify-between hover:bg-sky-500/10 transition shadow-lg shadow-sky-500/10">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-sky-500 px-3 py-1 text-[9px] font-black text-white uppercase tracking-wider">
                  人気No.1
                </div>
                <div>
                  <div className="flex justify-between items-start mt-2">
                    <span className="rounded bg-sky-500/20 px-2.5 py-0.5 text-[10px] font-black text-sky-400">
                      標準パック
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-white mt-3">10 クレジット</h4>
                  <p className="text-2xl font-black text-sky-400 mt-1">¥1,000</p>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    最も選ばれている標準パッケージです。複数のロードマップを比較・検証したい方におすすめ。
                  </p>
                </div>
                <button
                  onClick={() => {
                    setPricingOpen(false);
                    handlePurchase(10);
                  }}
                  disabled={purchaseLoading}
                  className="mt-6 w-full rounded-xl bg-sky-500 hover:bg-sky-600 text-white py-3 text-xs font-black transition cursor-pointer disabled:opacity-50 shadow-md shadow-sky-500/20"
                >
                  {purchaseLoading ? "処理中..." : "10回分購入する"}
                </button>
              </div>

              {/* Tier 3: 30 Credits */}
              <div className="relative rounded-2xl border border-white/5 bg-white/5 p-6 flex flex-col justify-between hover:border-white/10 transition">
                <div>
                  <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black text-emerald-400">
                    500円分お得！
                  </span>
                  <h4 className="text-lg font-black text-white mt-3">30 クレジット</h4>
                  <p className="text-2xl font-black text-white mt-1">¥2,500</p>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    多くのジャンルでロードマップを生成して体系的なスキル習得をしたいヘビーユーザー向けのバリューパックです。
                  </p>
                </div>
                <button
                  onClick={() => {
                    setPricingOpen(false);
                    handlePurchase(30);
                  }}
                  disabled={purchaseLoading}
                  className="mt-6 w-full rounded-xl bg-white/10 hover:bg-white/20 text-white py-3 text-xs font-black transition cursor-pointer disabled:opacity-50"
                >
                  {purchaseLoading ? "処理中..." : "30回分購入する"}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
