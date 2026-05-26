"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { getSupabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface Category {
  slug: string;
  title: string;
  accent: string;
}

interface HeaderNavProps {
  defaultCategories: Category[];
}

export function HeaderNav({ defaultCategories }: HeaderNavProps) {
  const router = useRouter();
  const supabase = getSupabase();

  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auth & Credit States
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number | null>(null);

  // Fetch user categories from API on mount
  useEffect(() => {
    fetch("/api/admin/categories")
      .then((res) => res.json())
      .then((data: Array<{ slug: string; title: string; accent: string }>) => {
        if (Array.isArray(data) && data.length > 0) {
          const userCats = data.map((c) => ({
            slug: c.slug,
            title: c.title,
            accent: c.accent ?? "from-blue-500 to-cyan-400",
          }));
          // Merge with defaults, avoid duplicates by slug
          const existingSlugs = new Set(defaultCategories.map((c) => c.slug));
          const merged = [
            ...defaultCategories,
            ...userCats.filter((c) => !existingSlugs.has(c.slug)),
          ];
          setCategories(merged);
        }
      })
      .catch(() => {
        // Silently use defaults
      });
  }, [defaultCategories]);

  // Auth listener and credit fetcher
  useEffect(() => {
    if (!supabase) return;

    const fetchProfile = async (uid: string) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", uid)
        .single();
      if (!error && data) {
        setCredits(data.credits);
      }
    };

    // 1. Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setCredits(null);
      }
    });

    // 2. Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setUser(session.user);
          fetchProfile(session.user.id);
        } else {
          setUser(null);
          setCredits(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [dropdownOpen]);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="flex flex-wrap items-center gap-4 text-sm font-bold text-slate-600 sm:gap-6">
      <Link href="/articles" className="hover:text-slate-950 transition">
        Articles
      </Link>

      {/* Categories dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          onMouseEnter={() => setDropdownOpen(true)}
          className="flex items-center gap-1 hover:text-slate-950 transition cursor-pointer"
        >
          Categories
          <svg
            className={`h-3 w-3 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {dropdownOpen && (
          <div
            className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-slate-200 bg-white py-2 shadow-lg z-50"
            onMouseLeave={() => setDropdownOpen(false)}
          >
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/categories/${category.slug}`}
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-sky-50 hover:text-slate-950 transition"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full bg-gradient-to-r ${category.accent}`}
                />
                {category.title}
              </Link>
            ))}
            <div className="mt-1 border-t border-slate-100 pt-1">
              <Link
                href="/categories"
                onClick={() => setDropdownOpen(false)}
                className="block px-4 py-2 text-xs font-bold text-sky-600 hover:bg-sky-50 transition"
              >
                すべてのカテゴリを見る →
              </Link>
            </div>
          </div>
        )}
      </div>

      <Link href="/tags" className="hover:text-slate-950 transition">
        Tags
      </Link>

      <div className="h-4 w-px bg-slate-200 hidden sm:block" />

      {/* Auth Display */}
      {user ? (
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/generate"
            className="rounded-full bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-sky-600 transition flex items-center gap-1 font-black"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            ロードマップ作成
          </Link>
          <Link
            href="/dashboard"
            className="text-slate-700 hover:text-slate-950 transition flex items-center gap-1.5 text-xs font-black bg-slate-100 px-3 py-1.5 rounded-full"
          >
            ダッシュボード
            {credits !== null && (
              <span className="bg-sky-500 text-white rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none">
                {credits}
              </span>
            )}
          </Link>
          <button
            onClick={handleSignOut}
            className="text-xs font-bold text-slate-400 hover:text-red-500 transition cursor-pointer"
          >
            ログアウト
          </button>
        </div>
      ) : (
        <Link
          href="/login"
          className="rounded-full bg-sky-500 px-4 py-1.5 text-xs font-black text-white hover:bg-sky-600 transition"
        >
          ログイン
        </Link>
      )}
    </nav>
  );
}

