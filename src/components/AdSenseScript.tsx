import Script from "next/script";
import { siteConfig } from "@/lib/site";

export function AdSenseScript() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT ?? siteConfig.adsenseClient;

  if (!clientId) {
    return null;
  }

  return (
    <Script
      id="google-adsense"
      async
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      crossOrigin="anonymous"
    />
  );
}
