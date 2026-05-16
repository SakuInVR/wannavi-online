import { ArticleCard } from "@/components/ArticleCard";
import type { Article } from "@/lib/articles";

export function RelatedArticles({ articles }: { articles: Article[] }) {
  if (!articles.length) {
    return null;
  }

  return (
    <section className="mt-12 border-t border-slate-200 pt-8">
      <h2 className="text-2xl font-bold text-slate-950">次に読むロードマップ</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>
    </section>
  );
}
