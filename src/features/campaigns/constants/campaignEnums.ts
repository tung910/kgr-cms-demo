// Fixed value sets for the campaigns feature. Every `labelKey` lives in the
// `campaigns` namespace; translate with `t(labelKey, { ns: 'campaigns' })`.

// One-off (manual / scheduled) vs an always-on automated trigger (spec 7.1/7.3).
export const CAMPAIGN_KINDS = [
  { value: 'manual', labelKey: 'kind.manual' },
  { value: 'trigger', labelKey: 'kind.trigger' },
] as const;
export type CampaignKind = (typeof CAMPAIGN_KINDS)[number]['value'];

// How the notification is shown in the app (spec 7.1).
export const DISPLAY_TYPES = [
  { value: 'push', labelKey: 'displayType.push' },
  { value: 'banner', labelKey: 'displayType.banner' },
  { value: 'popup', labelKey: 'displayType.popup' },
] as const;
export type DisplayType = (typeof DISPLAY_TYPES)[number]['value'];

// Notification group: the opt-out unit the customer controls in the app
// (APP-060). `priority` is the auto-assigned tier (spec 7.1: "tầng ưu tiên tự
// gán"); a higher tier wins when several campaigns compete for one customer.
export const NOTIFICATION_GROUPS = [
  { value: 'core', labelKey: 'group.core', priority: 2 },
  { value: 'water_quality', labelKey: 'group.water_quality', priority: 2 },
  { value: 'device_error', labelKey: 'group.device_error', priority: 3 },
  { value: 'promotion', labelKey: 'group.promotion', priority: 1 },
  { value: 'service', labelKey: 'group.service', priority: 1 },
] as const;
export type NotificationGroup = (typeof NOTIFICATION_GROUPS)[number]['value'];

export function priorityOfGroup(group: NotificationGroup): number {
  return NOTIFICATION_GROUPS.find((item) => item.value === group)!.priority;
}

// Send immediately vs schedule a time (spec 7.1).
export const CAMPAIGN_SCHEDULES = [
  { value: 'send_now', labelKey: 'schedule.send_now' },
  { value: 'scheduled', labelKey: 'schedule.scheduled' },
] as const;
export type CampaignSchedule = (typeof CAMPAIGN_SCHEDULES)[number]['value'];

// The speced automated triggers (spec 7.3). Thresholds beyond the per-campaign
// "core days" come from the system config at evaluation time.
export const TRIGGER_PRESETS = [
  { value: 'core_due', labelKey: 'trigger.core_due' },
  { value: 'warranty_expiring', labelKey: 'trigger.warranty_expiring' },
  { value: 'high_tds', labelKey: 'trigger.high_tds' },
] as const;
export type TriggerPreset = (typeof TRIGGER_PRESETS)[number]['value'];

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

// Personal-owned vs rental units (spec 7.2).
export const USAGE_TYPES = [
  { value: 'personal', labelKey: 'usageType.personal' },
  { value: 'rental', labelKey: 'usageType.rental' },
] as const;
export type UsageType = (typeof USAGE_TYPES)[number]['value'];

// How several matching conditions combine.
export const AUDIENCE_LOGICS = [
  { value: 'and', labelKey: 'logic.and' },
  { value: 'or', labelKey: 'logic.or' },
] as const;
export type AudienceLogic = (typeof AUDIENCE_LOGICS)[number]['value'];

// De-duplication when one customer owns several matching devices.
export const DEDUPE_MODES = [
  { value: 'account', labelKey: 'dedupe.account' },
  { value: 'device', labelKey: 'dedupe.device' },
] as const;
export type DedupeMode = (typeof DEDUPE_MODES)[number]['value'];
