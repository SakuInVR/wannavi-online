import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { AdSenseScript } from "@/components/AdSenseScript";
import { AnalyticsScript } from "@/components/AnalyticsScript";
import { siteConfig, staticPages } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | なりたい自分へのロードマップ`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "ja_JP",
    type: "website",
  },
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? {
        google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
      }
    : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <AdSenseScript />
        <AnalyticsScript />
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
            <Link href="/" className="text-lg font-black tracking-tight text-slate-950">
              Wanna Navi
            </Link>
            <nav className="flex items-center gap-4 text-sm font-bold text-slate-600">
              <Link href="/articles" className="hover:text-slate-950">
                Articles
              </Link>
              <Link href="/categories" className="hover:text-slate-950">
                Categories
              </Link>
              <Link href="/tags" className="hover:text-slate-950">
                Tags
              </Link>
              <Link href="/categories/ai-engineer" className="hover:text-slate-950">
                AI
              </Link>
              <Link href="/categories/dtm" className="hover:text-slate-950">
                DTM
              </Link>
              <Link href="/categories/vr-creator" className="hover:text-slate-950">
                VR
              </Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="border-t border-slate-200 bg-slate-950 px-5 py-10 text-white">
          <div className="mx-auto max-w-6xl">
            <p className="text-lg font-black">Wanna Navi</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              なりたい自分へ進むための最初の一歩を、ロードマップと道具選びでナビゲートします。
            </p>
            <nav className="mt-6 flex flex-wrap gap-4 text-sm font-bold text-slate-300">
              {staticPages.map((page) => (
                <Link key={page.href} href={page.href} className="hover:text-white">
                  {page.title}
                </Link>
              ))}
            </nav>
            <p className="mt-6 text-xs text-slate-500">
              Some links may be affiliate links. Copyright {new Date().getFullYear()} Wanna Navi.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
