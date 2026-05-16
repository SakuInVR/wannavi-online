import type { ArticleHeading } from "@/lib/articles";

export function TableOfContents({ headings }: { headings: ArticleHeading[] }) {
  if (!headings.length) {
    return null;
  }

  return (
    <nav className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-black text-slate-950">この記事の目次</p>
      <ol className="mt-3 space-y-2 text-sm font-semibold text-slate-600">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a href={`#${heading.id}`} className="hover:text-sky-700">
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
