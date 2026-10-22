import { z } from 'zod';

import type { PageResponse } from '@/shared/types/pagination';

import type {
  CampaignChannel,
  CampaignKind,
  CampaignSchedule,
  DiscountType,
  OfferType,
  TriggerPreset,
} from '../constants/campaignEnums';
import type { CampaignStatus } from '../constants/campaignStatus';
import { CAMPAIGN_TENANT_ID } from '../constants/campaignTenant';
import { APP_DEEPLINK_VALUES } from '../constants/deeplinkTargets';
import {
  audienceConditionsSchema,
  type AudienceConditions,
} from './audienceSchemas';

const campaignStatusSchema = z.enum([
  'draft',
  'pending_approval',
  'approved',
  'running',
  'paused',
  'ended',
  'rejected',
]) satisfies z.ZodType<CampaignStatus>;

const campaignKindSchema = z.enum([
  'manual',
  'trigger',
]) satisfies z.ZodType<CampaignKind>;

const campaignChannelSchema = z.enum([
  'push',
  'in_app',
]) satisfies z.ZodType<CampaignChannel>;

const campaignScheduleSchema = z.enum([
  'send_now',
  'scheduled',
]) satisfies z.ZodType<CampaignSchedule>;

const triggerPresetSchema = z.enum([
  'core_due',
  'warranty_expiring',
  'high_tds',
  'repurchase_due',
]) satisfies z.ZodType<TriggerPreset>;

const offerTypeSchema = z.enum([
  'voucher',
  'loyalty_points',
]) satisfies z.ZodType<OfferType>;

const discountTypeSchema = z.enum([
  'percent',
  'amount',
]) satisfies z.ZodType<DiscountType>;

// Embedded offer (spec 7.4): a discount voucher OR reward points, with a usage
// cap and validity window. Passed through unchanged between API and domain.
export const campaignOfferSchema = z.object({
  type: offerTypeSchema,
  codeMode: z.enum(['shared', 'per_customer']).optional(),
  voucherCode: z.string().optional(),
  discountType: discountTypeSchema.optional(),
  discountValue: z.number().nonnegative().optional(),
  points: z.number().int().nonnegative().optional(),
  usageLimitTotal: z.number().int().positive().optional(),
  usageLimitPerCustomer: z.number().int().positive().optional(),
  validUntil: z.string().optional(),
});
export type CampaignOffer = z.infer<typeof campaignOfferSchema>;

export const campaignDtoSchema = z.object({
  priority: z.number().int().nonnegative(),
  tenant_id: z.string().min(1),
  id: z.string().min(1),
  name: z.string().min(1),
  kind: campaignKindSchema,
  channel: campaignChannelSchema,
  // Multi-language content (spec 7.1.d): Vietnamese required, English optional.
  content_vi: z.string(),
  content_en: z.string().nullable(),
  image_url: z.string().nullable(),
  deeplink: z.string().nullable(),
  schedule_type: campaignScheduleSchema,
  starts_at: z.string().datetime({ offset: true }).nullable(),
  ends_at: z.string().datetime({ offset: true }).nullable(),
  status: campaignStatusSchema,
  trigger_preset: triggerPresetSchema.nullable(),
  frequency_cap_per_customer: z.number().int().nonnegative(),
  audience: audienceConditionsSchema,
  // Last previewed matching-customer count; null until the author previews.
  audience_count: z.number().int().nonnegative().nullable(),
  offer: campaignOfferSchema.nullable(),
  created_by: z.string(),
  created_by_name: z.string(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
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
  rejected: z.number().int().nonnegative(),
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
  revenue: z.number().nonnegative(),
});
export type CampaignMetricsDto = z.infer<typeof campaignMetricsDtoSchema>;

// ---- domain ----------------------------------------------------------------

export interface Campaign {
  id: string;
  priority: number;
  tenantId: string;
  name: string;
  kind: CampaignKind;
  channel: CampaignChannel;
  contentVi: string;
  contentEn: string | null;
  imageUrl: string | null;
  deeplink: string | null;
  scheduleType: CampaignSchedule;
  startsAt: string | null;
  endsAt: string | null;
  status: CampaignStatus;
  triggerPreset: TriggerPreset | null;
  frequencyCapPerCustomer: number;
  audience: AudienceConditions;
  audienceCount: number | null;
  offer: CampaignOffer | null;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
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
  revenue: number;
}

export interface CampaignCounts {
  total: number;
  draft: number;
  pendingApproval: number;
  approved: number;
  running: number;
  paused: number;
  ended: number;
  rejected: number;
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
  channel: CampaignChannel;
  contentVi: string;
  contentEn: string | null;
  imageUrl: string | null;
  deeplink: string | null;
  scheduleType: CampaignSchedule;
  startsAt: string | null;
  endsAt: string | null;
  triggerPreset: TriggerPreset | null;
  frequencyCapPerCustomer: number;
  audience: AudienceConditions;
  audienceCount: number | null;
  offer: CampaignOffer | null;
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

// Request body shape for creating/saving a draft (camelCase), used by the
// mock backend to validate what the wizard sends.
export const campaignDraftInputSchema = z.object({
  reason: z.string().trim().min(1),
  priority: z.number().int().nonnegative(),
  tenantId: z.literal(CAMPAIGN_TENANT_ID),
  name: z.string().min(1),
  kind: campaignKindSchema,
  channel: campaignChannelSchema,
  contentVi: z.string().min(1),
  contentEn: z.string().nullable(),
  // Image is an uploaded inline data URL (spec 7.1.a, decision #1) — never an
  // external URL.
  imageUrl: z
    .string()
    .nullable()
    .refine((value) => value === null || value.startsWith('data:image/'), {
      message: 'invalid_image',
    }),
  // Deeplink must be a registered app screen (spec 7.1.c) — enum membership,
  // not free text; null means "no CTA target".
  deeplink: z
    .string()
    .nullable()
    .refine((value) => value === null || APP_DEEPLINK_VALUES.includes(value), {
      message: 'invalid_deeplink',
    }),
  scheduleType: campaignScheduleSchema,
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  triggerPreset: triggerPresetSchema.nullable(),
  frequencyCapPerCustomer: z.number().int().nonnegative(),
  audience: audienceConditionsSchema,
  audienceCount: z.number().int().nonnegative().nullable(),
  offer: campaignOfferSchema.nullable(),
});

export type CampaignPage = PageResponse<Campaign>;
