"use client";

import Link from "next/link";
import { useRef, useState } from "react";

export interface MarqueeCategory {
  slug: string;
  title: string;
  description: string;
  accent: string;
}

export function CategoryMarquee({
  categories,
}: {
  categories: MarqueeCategory[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // If 5 or fewer categories, just duplicate once. If more, duplicate once is enough.
  const displayCategories =
    categories.length <= 5
      ? [...categories, ...categories]
      : categories;

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Gradient fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-slate-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-r from-transparent to-slate-950" />

      <div
        ref={scrollRef}
        className="flex gap-3"
        style={{
          animation: `marquee-scroll ${Math.max(categories.length * 4, 20)}s linear infinite`,
          animationPlayState: isPaused ? "paused" : "running",
          width: "max-content",
        }}
      >
        {displayCategories.map((category, i) => (
          <Link
            key={`${category.slug}-${i}`}
            href={`/categories/${category.slug}`}
            className="shrink-0 rounded-lg bg-white p-5 text-slate-950 transition hover:-translate-y-0.5 hover:bg-sky-50"
            style={{ width: "280px" }}
          >
            <div
              className={`h-1.5 w-24 rounded-full bg-gradient-to-r ${category.accent}`}
            />
            <h2 className="mt-4 text-xl font-black">{category.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 line-clamp-2">
              {category.description}
            </p>
          </Link>
        ))}
      </div>

      <style jsx>{`
        @keyframes marquee-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
