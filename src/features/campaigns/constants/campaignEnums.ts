// Fixed value sets for the campaigns feature. Every `labelKey` lives in the
// `campaigns` namespace; translate with `t(labelKey, { ns: 'campaigns' })`.

// Manual campaign vs an always-on automated trigger (spec 7.1 vs 7.3).
export const CAMPAIGN_KINDS = [
  { value: 'manual', labelKey: 'kind.manual' },
  { value: 'trigger', labelKey: 'kind.trigger' },
] as const;
export type CampaignKind = (typeof CAMPAIGN_KINDS)[number]['value'];

// Delivery channel (spec 7.1).
export const CAMPAIGN_CHANNELS = [
  { value: 'push', labelKey: 'channel.push' },
  { value: 'in_app', labelKey: 'channel.in_app' },
] as const;
export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number]['value'];

// Send immediately vs schedule a window (spec 7.1).
export const CAMPAIGN_SCHEDULES = [
  { value: 'send_now', labelKey: 'schedule.send_now' },
  { value: 'scheduled', labelKey: 'schedule.scheduled' },
] as const;
export type CampaignSchedule = (typeof CAMPAIGN_SCHEDULES)[number]['value'];

// Offer attached to a campaign (spec 7.4): a discount voucher or reward points.
export const OFFER_TYPES = [
  { value: 'voucher', labelKey: 'offer.type.voucher' },
  { value: 'loyalty_points', labelKey: 'offer.type.loyalty_points' },
] as const;
export type OfferType = (typeof OFFER_TYPES)[number]['value'];

export const DISCOUNT_TYPES = [
  { value: 'percent', labelKey: 'offer.discount.percent' },
  { value: 'amount', labelKey: 'offer.discount.amount' },
] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number]['value'];

// The speced automated triggers (spec 7.3). Thresholds are read from the system
// config at evaluation time, not hard-coded here. `core_due`/`high_tds` rely on
// live telemetry so they only fire on IoT devices; `warranty_expiring` (from the
// registration date) and `repurchase_due` (from purchase cadence) need no sensor,
// so they also reach non-IoT products.
export const TRIGGER_PRESETS = [
  { value: 'core_due', labelKey: 'trigger.core_due' },
  { value: 'warranty_expiring', labelKey: 'trigger.warranty_expiring' },
  { value: 'high_tds', labelKey: 'trigger.high_tds' },
  { value: 'repurchase_due', labelKey: 'trigger.repurchase_due' },
] as const;
export type TriggerPreset = (typeof TRIGGER_PRESETS)[number]['value'];

// Warranty states usable as a segmentation condition (spec 7.2), mirroring
// DeviceWarrantyStatus so the audience mock stays consistent with device data.
export const SEGMENT_WARRANTY_STATUSES = [
  { value: 'active', labelKey: 'warranty.active' },
  { value: 'expiring', labelKey: 'warranty.expiring' },
  { value: 'expired', labelKey: 'warranty.expired' },
  { value: 'none', labelKey: 'warranty.none' },
] as const;
export type SegmentWarrantyStatus =
  (typeof SEGMENT_WARRANTY_STATUSES)[number]['value'];

export const VOUCHER_CODE_MODES = [
  { value: 'per_customer', labelKey: 'offer.codeMode.per_customer' },
  { value: 'shared', labelKey: 'offer.codeMode.shared' },
] as const;
