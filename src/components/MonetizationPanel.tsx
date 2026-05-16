import { AffiliateCTA } from "@/components/AffiliateCTA";
import { getMonetizationOffer } from "@/lib/monetization";

export function MonetizationPanel({ category }: { category: string }) {
  const offer = getMonetizationOffer(category);

  if (!offer) {
    return null;
  }

  return (
    <AffiliateCTA
      title={offer.title}
      description={offer.description}
      href={offer.href}
      label={offer.label}
      trackingLabel={`category:${category}`}
    />
  );
}
