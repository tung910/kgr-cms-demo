import type { CampaignOffer } from '../schemas/campaignSchemas';

// One-line description of an attached offer for summaries and the preview.
export function offerText(
  offer: CampaignOffer | null,
  t: (key: string, options?: Record<string, unknown>) => string
): string | null {
  if (!offer) return null;
  if (offer.type === 'loyalty_points')
    return t('offer.pointsText', { count: offer.points ?? 0 });
  const value =
    offer.discountType === 'percent'
      ? `${offer.discountValue ?? 0}%`
      : `${(offer.discountValue ?? 0).toLocaleString('vi')}${t('unit.vnd')}`;
  return `${offer.voucherCode ?? ''} · ${t('offer.voucherText', { value })}`;
}
