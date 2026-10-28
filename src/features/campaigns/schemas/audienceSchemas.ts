import { z } from 'zod';

import type { ProductConnectivity } from '@/shared/constants/productConnectivity';

import type {
  AudienceLogic,
  DedupeMode,
  SegmentWarrantyStatus,
  UsageType,
} from '../constants/campaignEnums';

// Shared product-connectivity vocabulary (iot | non_iot), the same set the
// device screens use, so campaigns and devices label connectivity identically.
export const productConnectivitySchema = z.enum([
  'iot',
  'non_iot',
]) satisfies z.ZodType<ProductConnectivity>;

// Segmentation conditions (spec 7.2). This nested blob is passed through
// unchanged between the API boundary and the domain (not flattened to
// snake_case like a flat DTO), so the same schema serves the request body,
// the stored campaign, and the audience-preview call.
export const segmentWarrantyStatusSchema = z.enum([
  'active',
  'expiring',
  'expired',
  'none',
]) satisfies z.ZodType<SegmentWarrantyStatus>;

export const usageTypeSchema = z.enum([
  'personal',
  'rental',
]) satisfies z.ZodType<UsageType>;

export const audienceLogicSchema = z.enum([
  'and',
  'or',
]) satisfies z.ZodType<AudienceLogic>;

export const dedupeModeSchema = z.enum([
  'account',
  'device',
]) satisfies z.ZodType<DedupeMode>;

export const numberRangeSchema = z
  .object({
    min: z.number().nonnegative().optional(),
    max: z.number().nonnegative().optional(),
  })
  .refine(
    (value) => value.min == null || value.max == null || value.min <= value.max,
    { message: 'invalid_range', path: ['max'] }
  )
  .optional();
export type NumberRange = NonNullable<z.infer<typeof numberRangeSchema>>;

const integerRangeSchema = numberRangeSchema.refine(
  (value) =>
    !value ||
    [value.min, value.max].every(
      (bound) => bound == null || Number.isInteger(bound)
    ),
  { message: 'integer_required' }
);

export const audienceConditionsSchema = z.object({
  // How the conditions below combine: every one (and) or any one (or).
  logic: audienceLogicSchema.default('and'),
  // Multi-select fields: an empty array means "no constraint on this field".
  regions: z.array(z.string().min(1)).default([]),
  models: z.array(z.string().min(1)).default([]),
  firmwareVersions: z.array(z.string().min(1)).default([]),
  warrantyStatuses: z.array(segmentWarrantyStatusSchema).default([]),
  usageTypes: z.array(usageTypeSchema).default([]),
  // Product connectivity: empty = no constraint. Picking only `non_iot` targets
  // offline products; picking only `iot` keeps the audience to connected units.
  connectivities: z.array(productConnectivitySchema).default([]),
  // Numeric range fields (undefined = no constraint).
  coreRemainingDays: integerRangeSchema,
  loyaltyPoints: integerRangeSchema,
  regionTds: numberRangeSchema,
  // Excludes devices that already hold an unexpired entitlement of this
  // package (spec 4.4); undefined = no constraint.
  excludeActivePackageId: z.string().min(1).optional(),
});
export type AudienceConditions = z.infer<typeof audienceConditionsSchema>;

export const EMPTY_AUDIENCE_CONDITIONS: AudienceConditions = {
  logic: 'and',
  regions: [],
  models: [],
  firmwareVersions: [],
  warrantyStatuses: [],
  usageTypes: [],
  connectivities: [],
};

// Customers excluded from a send beyond the always-on opt-out (APP-060).
export const suppressionSchema = z.object({
  // Received another campaign in the last 24 hours.
  recentCampaign: z.boolean(),
  // Internal test accounts.
  testAccounts: z.boolean(),
});
export type Suppression = z.infer<typeof suppressionSchema>;

export const DEFAULT_SUPPRESSION: Suppression = {
  recentCampaign: true,
  testAccounts: true,
};

// The full audience definition the preview endpoint evaluates.
export const audienceDefinitionSchema = z.object({
  conditions: audienceConditionsSchema,
  dedupe: dedupeModeSchema,
  suppression: suppressionSchema,
});
export type AudienceDefinition = z.infer<typeof audienceDefinitionSchema>;

export const audienceDeviceDtoSchema = z.object({
  device_id: z.string().min(1),
  region: z.string().min(1),
  model_name: z.string().min(1),
  firmware_version: z.string().min(1),
  core_remaining_days: z.number().int().nonnegative(),
  warranty_status: segmentWarrantyStatusSchema,
  region_tds: z.number().nonnegative(),
  warranty_remaining_days: z.number().int(),
  usage_type: usageTypeSchema,
  // 'non_iot' for products that never connect to the cloud (spec: e-warranty is
  // auto-issued "on first cloud connection"). A non-IoT unit has no live
  // firmware/core/TDS, so telemetry segmentation conditions cannot reach it;
  // it is addressed through registration/commerce dimensions instead.
  connectivity: productConnectivitySchema,
  // Days since the customer last bought a consumable for this device (commerce
  // signal, not a sensor) — drives the "đã mua lõi → dừng nhắc" exit rule.
  last_core_purchase_days_ago: z.number().int().nonnegative(),
  // IDs of the service packages this device holds a still-valid entitlement of.
  active_package_ids: z.array(z.string()),
});
export type AudienceDeviceDto = z.infer<typeof audienceDeviceDtoSchema>;

export const audienceCustomerDtoSchema = z.object({
  customer_id: z.string().min(1),
  name: z.string().min(1),
  devices: z.array(audienceDeviceDtoSchema),
  loyalty_points: z.number().int().nonnegative(),
  first_activated_at: z.string().datetime({ offset: true }),
  // Marketing consent (Nghị định 13, spec 7.7.a). Opted-out customers are
  // hard-excluded from every send set — manual campaigns and triggers alike —
  // before any segmentation condition is evaluated.
  opt_in: z.boolean(),
  // Internal test account, excluded unless the author turns that rule off.
  is_test: z.boolean(),
});
export type AudienceCustomerDto = z.infer<typeof audienceCustomerDtoSchema>;

export const audiencePreviewDtoSchema = z.object({
  total: z.number().int().nonnegative(),
  // Customers satisfying the conditions, before any exclusion.
  eligible: z.number().int().nonnegative(),
  // Customers who will really receive it, after opt-out and exclusions.
  matched: z.number().int().nonnegative(),
  // Of the matched customers, how many were reached through a non-IoT device —
  // the on-screen signal that a segment includes offline products.
  matched_non_iot: z.number().int().nonnegative(),
  sample: z.array(audienceCustomerDtoSchema.omit({ first_activated_at: true })),
  // True when the sample names were masked for the viewer's role (no
  // device.pii.full); mirrors the owner-profile pii_masked flag (NĐ 13).
  pii_masked: z.boolean(),
});
export type AudiencePreviewDto = z.infer<typeof audiencePreviewDtoSchema>;

export interface AudienceCustomer {
  customerId: string;
  name: string;
  devices: AudienceDevice[];
  loyaltyPoints: number;
  optIn: boolean;
}

export interface AudienceDevice {
  deviceId: string;
  region: string;
  modelName: string;
  firmwareVersion: string;
  coreRemainingDays: number;
  warrantyStatus: SegmentWarrantyStatus;
  regionTds: number;
  warrantyRemainingDays: number;
  usageType: UsageType;
  connectivity: ProductConnectivity;
  lastCorePurchaseDaysAgo: number;
}

export interface AudiencePreview {
  total: number;
  eligible: number;
  matched: number;
  matchedNonIot: number;
  sample: AudienceCustomer[];
  piiMasked: boolean;
}
