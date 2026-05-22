"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

interface Category {
  slug: string;
  title: string;
  accent: string;
}

interface HeaderNavProps {
  defaultCategories: Category[];
}

export function HeaderNav({ defaultCategories }: HeaderNavProps) {
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <nav className="flex flex-wrap items-center gap-4 text-sm font-bold text-slate-600">
      <Link href="/articles" className="hover:text-slate-950">
        Articles
      </Link>

      {/* Categories dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          onMouseEnter={() => setDropdownOpen(true)}
          className="flex items-center gap-1 hover:text-slate-950"
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
            className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-slate-200 bg-white py-2 shadow-lg"
            onMouseLeave={() => setDropdownOpen(false)}
          >
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/categories/${category.slug}`}
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-sky-50 hover:text-slate-950"
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
                className="block px-4 py-2 text-xs font-bold text-sky-600 hover:bg-sky-50"
              >
                すべてのカテゴリを見る →
              </Link>
            </div>
          </div>
        )}
      </div>

      <Link href="/tags" className="hover:text-slate-950">
        Tags
      </Link>
    </nav>
  );
}
