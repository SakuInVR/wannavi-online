import Link from "next/link";

import type { Article } from "@/lib/articles";

export function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
        <span>{article.categoryTitle}</span>
        <span aria-hidden="true">/</span>
        <span>{article.readingMinutes}</span>
      </div>
      <h3 className="text-xl font-bold leading-snug">
        <Link
          href={`/articles/${article.slug}`}
          className="text-slate-950 group-hover:text-sky-700"
        >
          {article.title}
        </Link>
      </h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{article.description}</p>
      {article.tags?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <Link
              key={tag}
              href={`/tags/${encodeURIComponent(tag)}`}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-sky-50 hover:text-sky-700"
            >
              {tag}
            </Link>
          ))}
        </div>
      ) : null}
    </article>
  );
}
