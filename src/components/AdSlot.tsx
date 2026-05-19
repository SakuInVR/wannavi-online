import { siteConfig } from "@/lib/site";

type AdSlotProps = {
  label?: string;
  slotName?: string;
  adSlotId?: string;
};

export function AdSlot({
  label = "Advertisement",
  slotName = "article-inline",
  adSlotId,
}: AdSlotProps) {
  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT ?? siteConfig.adsenseClient;
  const resolvedAdSlotId =
    adSlotId ?? process.env.NEXT_PUBLIC_ADSENSE_DEFAULT_SLOT;

  return (
    <aside
      className="my-8 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center"
      data-ad-slot={slotName}
    >
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
        {label}
      </p>
      {clientId && resolvedAdSlotId ? (
        <ins
          className="adsbygoogle block"
          data-ad-client={clientId}
          data-ad-slot={resolvedAdSlotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        <p className="mt-2 text-sm text-slate-500">
          広告枠。AdSense承認後に広告スロットIDを設定すると広告タグとして表示されます。
        </p>
      )}
    </aside>
  );
}
