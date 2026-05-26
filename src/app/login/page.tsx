"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabase();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  // Check if already logged in, redirect immediately
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push(redirectTo);
      }
    });
  }, [supabase, router, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setErrorMsg("データベースが設定されていません。環境変数を確認してください。");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (isSignUp) {
        // Sign Up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });

        if (error) throw error;

        // If email confirmation is enabled, they need to verify
        if (data.user && data.session === null) {
          setSuccessMsg("確認メールを送信しました。メールフォルダを確認してください（テスト環境では自動ログインできる場合があります）。");
        } else {
          setSuccessMsg("アカウント登録が完了しました！");
          setTimeout(() => {
            router.push(redirectTo);
            router.refresh();
          }, 1500);
        }
      } else {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setSuccessMsg("ログインしました！ダッシュボードへ移動します...");
        setTimeout(() => {
          router.push(redirectTo);
          router.refresh();
        }, 1200);
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "認証エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-sky-950 px-5 py-12">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
        <div className="text-center">
          <Link href="/" className="text-2xl font-black tracking-tight text-white hover:text-sky-300 transition">
            Wanna Navi
          </Link>
          <h2 className="mt-6 text-3xl font-black text-white">
            {isSignUp ? "アカウントを作成" : "ログイン"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {isSignUp
              ? "登録して無料ロードマップ記事を1回生成しましょう"
              : "アカウントにログインして記事の生成と管理を行います"}
          </p>
        </div>

        {errorMsg && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm font-semibold text-red-400">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mt-6 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-400">
            {successMsg}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              メールアドレス
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              パスワード
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white py-3 text-sm font-black text-slate-950 transition hover:bg-sky-100 disabled:opacity-50 flex justify-center items-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
            ) : isSignUp ? (
              "アカウントを登録 (無料枠1枚付与)"
            ) : (
              "ログイン"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className="text-xs font-bold text-sky-400 hover:text-sky-300 transition hover:underline"
          >
            {isSignUp ? "すでにアカウントをお持ちですか？ログイン" : "新しく登録する？アカウント作成"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[80vh] items-center justify-center bg-slate-950 text-white">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
