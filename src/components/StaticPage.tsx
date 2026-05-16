import Link from "next/link";

type StaticPageProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function StaticPage({ title, description, children }: StaticPageProps) {
  return (
    <main className="px-5 py-14">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-bold text-sky-700 hover:text-sky-900">
          Wanna Navi トップへ
        </Link>
        <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950">
          {title}
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">{description}</p>
        <div className="article-body mt-10 rounded-lg bg-white p-6 shadow-sm">
          {children}
        </div>
      </div>
    </main>
  );
}
