import { AdCreativeCard } from "@/components/AdCreativeCard";
import { getAdCreative, getAdCreativeHref } from "@/lib/ad-creatives";

type ProductAdProps = {
  id: string;
};

export function ProductAd({ id }: ProductAdProps) {
  const creative = getAdCreative(id);

  if (!creative || creative.status !== "approved" || !creative.imageUrl) {
    return null;
  }

  return (
    <AdCreativeCard
      id={creative.id}
      title={creative.title}
      description={creative.description}
      href={getAdCreativeHref(creative)}
      imageUrl={creative.imageUrl}
      imageAlt={creative.imageAlt ?? creative.title}
      impressionUrl={creative.impressionUrl}
    />
  );
}
