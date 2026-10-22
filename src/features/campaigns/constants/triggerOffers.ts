// Trigger-driven automatic offers (spec 7.3). Some triggers carry a default
// upsell offer the author does not attach by hand: a `high_tds` reminder ("chất
// lượng nước khu vực kém") always suggests a filter-core upsell voucher so the
// customer can act immediately. The mock keeps this default here; a real backend
// would read it from the per-tenant campaign config and the e-commerce catalogue.
import type { CampaignKind, TriggerPreset } from './campaignEnums';
import type {
  Campaign,
  CampaignDto,
  CampaignOffer,
} from '../schemas/campaignSchemas';

// Default upsell voucher applied to a `high_tds` trigger when no offer is set.
// A per-customer code is minted at send time (see the dispatcher), mirroring a
// manually attached per-customer voucher.
export const TDS_UPSELL_OFFER: CampaignOffer = {
  type: 'voucher',
  codeMode: 'per_customer',
  voucherCode: 'TDS-UPSELL',
  discountType: 'percent',
  discountValue: 10,
  usageLimitPerCustomer: 1,
};

// Triggers whose upsell offer is attached automatically, keyed by preset.
const AUTO_OFFER_BY_TRIGGER: Partial<Record<TriggerPreset, CampaignOffer>> = {
  high_tds: TDS_UPSELL_OFFER,
};

// Shape-agnostic core: author-set offers always win; otherwise a trigger
// campaign inherits its preset's automatic offer. Works for both the DTO
// (snake_case) and the domain (camelCase) by taking the three fields it needs.
function resolve(
  kind: CampaignKind,
  triggerPreset: TriggerPreset | null,
  offer: CampaignOffer | null
): { offer: CampaignOffer | null; auto: boolean } {
  if (offer) return { offer, auto: false };
  if (
    kind === 'trigger' &&
    triggerPreset &&
    AUTO_OFFER_BY_TRIGGER[triggerPreset]
  )
    return { offer: AUTO_OFFER_BY_TRIGGER[triggerPreset]!, auto: true };
  return { offer: null, auto: false };
}

// The offer that actually ships with the campaign (author's or the trigger's).
export function effectiveOfferDto(campaign: CampaignDto): CampaignOffer | null {
  return resolve(campaign.kind, campaign.trigger_preset, campaign.offer).offer;
}

// Domain-side result for the UI: the shipping offer plus whether it is the
// trigger's automatic upsell (so the screen can badge it as such).
export function effectiveOffer(campaign: Campaign): {
  offer: CampaignOffer | null;
  auto: boolean;
} {
  return resolve(campaign.kind, campaign.triggerPreset, campaign.offer);
}
