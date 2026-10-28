import { z } from 'zod';

import type { PageResponse } from '@/shared/types/pagination';

import {
  MAX_BUTTON_LABEL_LENGTH,
  MAX_CAMPAIGN_BUTTONS,
  type ButtonType,
  type CoreMode,
} from '../constants/campaignCta';
import type {
  CampaignKind,
  CampaignSchedule,
  DedupeMode,
  DiscountType,
  DisplayType,
  NotificationGroup,
  OfferType,
  TriggerPreset,
} from '../constants/campaignEnums';
import type { CampaignStatus } from '../constants/campaignStatus';
import { CAMPAIGN_TENANT_ID } from '../constants/campaignTenant';
import { APP_DEEPLINK_VALUES } from '../constants/deeplinkTargets';
import {
  audienceConditionsSchema,
  dedupeModeSchema,
  suppressionSchema,
  type AudienceConditions,
  type Suppression,
} from './audienceSchemas';

const campaignStatusSchema = z.enum([
  'draft',
  'pending_approval',
  'approved',
  'running',
  'paused',
  'ended',
]) satisfies z.ZodType<CampaignStatus>;

const campaignKindSchema = z.enum([
  'manual',
  'trigger',
]) satisfies z.ZodType<CampaignKind>;

const displayTypeSchema = z.enum([
  'push',
  'banner',
  'popup',
]) satisfies z.ZodType<DisplayType>;

const notificationGroupSchema = z.enum([
  'core',
  'water_quality',
  'device_error',
  'promotion',
  'service',
]) satisfies z.ZodType<NotificationGroup>;

const campaignScheduleSchema = z.enum([
  'send_now',
  'scheduled',
]) satisfies z.ZodType<CampaignSchedule>;

const triggerPresetSchema = z.enum([
  'core_due',
  'warranty_expiring',
  'high_tds',
]) satisfies z.ZodType<TriggerPreset>;

const buttonTypeSchema = z.enum([
  'buy_core',
  'book_technician',
  'renew_warranty',
  'open_screen',
  'buy_service_package',
]) satisfies z.ZodType<ButtonType>;

const coreModeSchema = z.enum([
  'auto',
  'specific',
]) satisfies z.ZodType<CoreMode>;

// One call-to-action button (spec 7.1): its type decides the parameters.
// "Mua lõi" targets the customer's own device (`auto`) or the SKUs picked from
// the core catalogue (`specific`); "Mở màn hình khác" names a registered app
// screen. Everything else only needs a label.
export const campaignButtonSchema = z
  .object({
    type: buttonTypeSchema,
    label: z.string().trim().min(1).max(MAX_BUTTON_LABEL_LENGTH),
    coreMode: coreModeSchema.optional(),
    coreSkus: z.array(z.string().min(1)).optional(),
    screen: z.string().optional(),
  })
  .refine(
    (button) =>
      button.type !== 'buy_core' ||
      button.coreMode !== 'specific' ||
      (button.coreSkus?.length ?? 0) > 0,
    { message: 'core_required', path: ['coreSkus'] }
  )
  .refine(
    (button) =>
      button.type !== 'open_screen' ||
      (!!button.screen && APP_DEEPLINK_VALUES.includes(button.screen)),
    { message: 'invalid_deeplink', path: ['screen'] }
  );
export type CampaignButton = z.infer<typeof campaignButtonSchema>;
const buttonsSchema = z.array(campaignButtonSchema).max(MAX_CAMPAIGN_BUTTONS);

export const coreOptionDtoSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
});
export const coreOptionListDtoSchema = z.array(coreOptionDtoSchema);
export type CoreOption = z.infer<typeof coreOptionDtoSchema>;

// Minimal catalogue summary of the promoted package (spec §5). Campaign screens
// read this embedded copy instead of the service-package catalogue, so they do
// not need `service_package.read`. `grantable` is true when the package is
// active and fully configured (the same rule the inventory import uses).
export const promotedPackageDtoSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  group: z.enum(['installation', 'warranty', 'maintenance', 'care', 'bundle']),
  status: z.enum(['draft', 'active', 'archived']),
  grantable: z.boolean(),
  billing_type: z.enum(['one_time', 'recurring', 'subscription']),
  price: z.number().int().nonnegative().nullable(),
  // Length of one billing period; the voucher discounts the first one only.
  billing_period_months: z.number().int().positive().nullable(),
  pricing_mode: z.enum(['fixed', 'free_or_included', 'quotation']),
  term_months: z.number().int().positive().nullable(),
});
export const promotedPackageListDtoSchema = z.array(promotedPackageDtoSchema);
export type PromotedPackageDto = z.infer<typeof promotedPackageDtoSchema>;

export interface PromotedPackage {
  id: string;
  code: string;
  name: string;
  group: PromotedPackageDto['group'];
  status: PromotedPackageDto['status'];
  grantable: boolean;
  billingType: PromotedPackageDto['billing_type'];
  price: number | null;
  billingPeriodMonths: number | null;
  pricingMode: PromotedPackageDto['pricing_mode'];
  termMonths: number | null;
}

const offerTypeSchema = z.enum([
  'voucher',
  'loyalty_points',
]) satisfies z.ZodType<OfferType>;

const discountTypeSchema = z.enum([
  'percent',
  'amount',
]) satisfies z.ZodType<DiscountType>;

// Embedded offer (spec 7.4): a discount voucher OR reward points, with a usage
// cap, a validity window and an optional product/error-code binding (synced to
// the storefront). Passed through unchanged between API and domain.
export const campaignOfferSchema = z.object({
  type: offerTypeSchema,
  voucherCode: z.string().optional(),
  discountType: discountTypeSchema.optional(),
  discountValue: z.number().nonnegative().optional(),
  points: z.number().int().nonnegative().optional(),
  usageLimitTotal: z.number().int().positive().optional(),
  validUntil: z.string().optional(),
  // Product SKU or error code the offer is bound to, e.g. "ER00051".
  appliesTo: z.string().optional(),
});
export type CampaignOffer = z.infer<typeof campaignOfferSchema>;

const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

// Run rules of an always-on trigger campaign (spec 7.3).
export const triggerConfigSchema = z.object({
  // "Lõi còn ≤ N ngày"; only used by the core_due preset.
  coreDays: z.number().int().min(1).max(365).optional(),
  exitOnPurchase: z.boolean(),
  exitOnWarrantyRenewed: z.boolean(),
  cooldownDays: z.number().int().min(0).max(365),
  maxSends: z.number().int().min(1).max(100),
  quietFrom: timeOfDaySchema,
  quietTo: timeOfDaySchema,
  fallbackSmsZalo: z.boolean(),
});
export type TriggerConfig = z.infer<typeof triggerConfigSchema>;

export const DEFAULT_TRIGGER_CONFIG: TriggerConfig = {
  coreDays: 15,
  exitOnPurchase: true,
  exitOnWarrantyRenewed: false,
  cooldownDays: 3,
  maxSends: 3,
  quietFrom: '22:00',
  quietTo: '07:00',
  fallbackSmsZalo: false,
};

// A/B test of the content (spec 7.1): variant B replaces title/body for the
// `splitB` percent of recipients.
export const abTestSchema = z.object({
  titleB: z.string(),
  bodyB: z.string(),
  splitB: z.number().int().min(1).max(99),
});
export type AbTest = z.infer<typeof abTestSchema>;

export const campaignDtoSchema = z.object({
  priority: z.number().int().nonnegative(),
  tenant_id: z.string().min(1),
  id: z.string().min(1),
  name: z.string().min(1),
  kind: campaignKindSchema,
  display_type: displayTypeSchema,
  notification_group: notificationGroupSchema,
  title: z.string(),
  content: z.string(),
  buttons: buttonsSchema,
  schedule_type: campaignScheduleSchema,
  starts_at: z.string().datetime({ offset: true }).nullable(),
  ends_at: z.string().datetime({ offset: true }).nullable(),
  status: campaignStatusSchema,
  trigger_preset: triggerPresetSchema.nullable(),
  trigger_config: triggerConfigSchema.nullable(),
  frequency_cap_per_customer: z.number().int().nonnegative(),
  audience: audienceConditionsSchema,
  dedupe: dedupeModeSchema,
  suppression: suppressionSchema,
  // Last previewed number of customers who would receive it; null until the
  // author previews.
  audience_count: z.number().int().nonnegative().nullable(),
  ab_test: abTestSchema.nullable(),
  offer: campaignOfferSchema.nullable(),
  // Optional promoted service package: the reference plus a catalogue summary.
  promoted_package_id: z.string().nullable(),
  promoted_package: promotedPackageDtoSchema.nullable(),
  test_recipients: z.array(z.string()),
  created_by: z.string(),
  created_by_name: z.string(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
  approver_id: z.string().nullable(),
  approver_name: z.string().nullable(),
  approved_by: z.string().nullable(),
  approved_by_name: z.string().nullable(),
  approved_at: z.string().datetime({ offset: true }).nullable(),
  rejected_reason: z.string().nullable(),
});
export type CampaignDto = z.infer<typeof campaignDtoSchema>;

export const campaignPageDtoSchema = z.object({
  items: z.array(campaignDtoSchema),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});
export type CampaignPageDto = z.infer<typeof campaignPageDtoSchema>;

export const campaignCountsDtoSchema = z.object({
  total: z.number().int().nonnegative(),
  draft: z.number().int().nonnegative(),
  pending_approval: z.number().int().nonnegative(),
  approved: z.number().int().nonnegative(),
  running: z.number().int().nonnegative(),
  paused: z.number().int().nonnegative(),
  ended: z.number().int().nonnegative(),
});
export type CampaignCountsDto = z.infer<typeof campaignCountsDtoSchema>;

export const campaignMetricsDtoSchema = z.object({
  attribution_model: z.literal('last_click'),
  attribution_window_days: z.number().int().positive(),
  send_id: z.string(),
  failed: z.number().int().nonnegative(),
  failure_reason: z.string().nullable(),
  sent: z.number().int().nonnegative(),
  delivered: z.number().int().nonnegative(),
  opened: z.number().int().nonnegative(),
  clicked: z.number().int().nonnegative(),
  conversions_booking: z.number().int().nonnegative(),
  conversions_qr: z.number().int().nonnegative(),
  orders: z.number().int().nonnegative(),
  revenue: z.number().nonnegative(),
  // Customers who turned this notification group off (APP-060) and therefore
  // never received the campaign.
  suppressed_opt_out: z.number().int().nonnegative(),
  // Part of `orders` / `revenue` that came from the promoted package, after the
  // voucher; recurring packages count the first period only (spec 4.6).
  package_purchases: z.number().int().nonnegative(),
  package_revenue: z.number().nonnegative(),
});
export type CampaignMetricsDto = z.infer<typeof campaignMetricsDtoSchema>;

export const approverDtoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});
export const approverListDtoSchema = z.array(approverDtoSchema);

// ---- domain ----------------------------------------------------------------

export interface Campaign {
  id: string;
  priority: number;
  tenantId: string;
  name: string;
  kind: CampaignKind;
  displayType: DisplayType;
  notificationGroup: NotificationGroup;
  title: string;
  content: string;
  buttons: CampaignButton[];
  scheduleType: CampaignSchedule;
  startsAt: string | null;
  endsAt: string | null;
  status: CampaignStatus;
  triggerPreset: TriggerPreset | null;
  triggerConfig: TriggerConfig | null;
  frequencyCapPerCustomer: number;
  audience: AudienceConditions;
  dedupe: DedupeMode;
  suppression: Suppression;
  audienceCount: number | null;
  abTest: AbTest | null;
  offer: CampaignOffer | null;
  promotedPackageId: string | null;
  promotedPackage: PromotedPackage | null;
  testRecipients: string[];
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  approverId: string | null;
  approverName: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
}

export interface CampaignMetrics {
  attributionModel: 'last_click';
  attributionWindowDays: number;
  sendId: string;
  failed: number;
  failureReason: string | null;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  conversionsBooking: number;
  conversionsQr: number;
  orders: number;
  revenue: number;
  suppressedOptOut: number;
  packagePurchases: number;
  packageRevenue: number;
}

export interface CampaignCounts {
  total: number;
  draft: number;
  pendingApproval: number;
  approved: number;
  running: number;
  paused: number;
  ended: number;
}

export interface CampaignApprover {
  id: string;
  name: string;
}

export interface CampaignListFilters {
  search: string;
  status?: CampaignStatus;
  kind?: CampaignKind;
  page: number;
  pageSize: number;
}

// Counts ignore pagination and the status filter.
export type CampaignCountFilters = Pick<CampaignListFilters, 'search' | 'kind'>;

// ---- write payloads --------------------------------------------------------

// Everything an author edits in the wizard before any lifecycle transition.
export interface CampaignDraftInput {
  reason: string;
  priority: number;
  tenantId: string;
  name: string;
  kind: CampaignKind;
  displayType: DisplayType;
  notificationGroup: NotificationGroup;
  title: string;
  content: string;
  buttons: CampaignButton[];
  scheduleType: CampaignSchedule;
  startsAt: string | null;
  endsAt: string | null;
  triggerPreset: TriggerPreset | null;
  triggerConfig: TriggerConfig | null;
  frequencyCapPerCustomer: number;
  audience: AudienceConditions;
  dedupe: DedupeMode;
  suppression: Suppression;
  audienceCount: number | null;
  abTest: AbTest | null;
  offer: CampaignOffer | null;
  promotedPackageId: string | null;
  testRecipients: string[];
}

export const CAMPAIGN_TRANSITIONS = [
  'submit',
  'approve',
  'reject',
  'run',
  'pause',
  'resume',
  'stop',
] as const;
export type CampaignTransition = (typeof CAMPAIGN_TRANSITIONS)[number];

export interface CampaignTransitionInput {
  action: CampaignTransition;
  reason: string;
  // Only for `submit`: the reviewer the campaign is sent to.
  approverId?: string;
}

// Request body shape for creating/saving a draft (camelCase), used by the
// mock backend to validate what the wizard sends. Content is only checked for
// completeness when the draft is submitted for approval.
export const campaignDraftInputSchema = z
  .object({
    reason: z.string().trim().min(1),
    priority: z.number().int().nonnegative(),
    tenantId: z.literal(CAMPAIGN_TENANT_ID),
    name: z.string().trim().min(1),
    kind: campaignKindSchema,
    displayType: displayTypeSchema,
    notificationGroup: notificationGroupSchema,
    title: z.string(),
    content: z.string(),
    buttons: buttonsSchema,
    scheduleType: campaignScheduleSchema,
    startsAt: z.string().nullable(),
    endsAt: z.string().nullable(),
    triggerPreset: triggerPresetSchema.nullable(),
    triggerConfig: triggerConfigSchema.nullable(),
    frequencyCapPerCustomer: z.number().int().nonnegative(),
    audience: audienceConditionsSchema,
    dedupe: dedupeModeSchema,
    suppression: suppressionSchema,
    audienceCount: z.number().int().nonnegative().nullable(),
    abTest: abTestSchema.nullable(),
    offer: campaignOfferSchema.nullable(),
    promotedPackageId: z.string().min(1).nullable(),
    testRecipients: z.array(z.string()),
  })
  // A "Mua gói dịch vụ" button needs a package to point at.
  .refine(
    (input) =>
      !input.buttons.some((button) => button.type === 'buy_service_package') ||
      !!input.promotedPackageId,
    { message: 'package_required', path: ['promotedPackageId'] }
  );

export type CampaignPage = PageResponse<Campaign>;
