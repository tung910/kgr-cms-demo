import { z } from 'zod';

import type { SegmentWarrantyStatus } from '../constants/campaignEnums';

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
  // Multi-select fields: an empty array means "no constraint on this field".
  regions: z.array(z.string().min(1)).default([]),
  models: z.array(z.string().min(1)).default([]),
  firmwareVersions: z.array(z.string().min(1)).default([]),
  warrantyStatuses: z.array(segmentWarrantyStatusSchema).default([]),
  // Numeric range fields (undefined = no constraint).
  coreRemainingDays: integerRangeSchema,
  loyaltyPoints: integerRangeSchema,
  regionTds: numberRangeSchema,
  tenureDays: integerRangeSchema,
});
export type AudienceConditions = z.infer<typeof audienceConditionsSchema>;

export const EMPTY_AUDIENCE_CONDITIONS: AudienceConditions = {
  regions: [],
  models: [],
  firmwareVersions: [],
  warrantyStatuses: [],
};

export const audienceDeviceDtoSchema = z.object({
  device_id: z.string().min(1),
  region: z.string().min(1),
  model_name: z.string().min(1),
  firmware_version: z.string().min(1),
  core_remaining_days: z.number().int().nonnegative(),
  warranty_status: segmentWarrantyStatusSchema,
  region_tds: z.number().nonnegative(),
  warranty_remaining_days: z.number().int(),
});
export type AudienceDeviceDto = z.infer<typeof audienceDeviceDtoSchema>;

export const audienceCustomerDtoSchema = z.object({
  customer_id: z.string().min(1),
  name: z.string().min(1),
  devices: z.array(audienceDeviceDtoSchema),
  loyalty_points: z.number().int().nonnegative(),
  first_activated_at: z.string().datetime({ offset: true }),
  tenure_days: z.number().int().nonnegative(),
  // Marketing consent (Nghị định 13, spec 7.7.a). Opted-out customers are
  // hard-excluded from every send set — manual campaigns and triggers alike —
  // before any segmentation condition is evaluated.
  opt_in: z.boolean(),
});
export type AudienceCustomerDto = z.infer<typeof audienceCustomerDtoSchema>;

export const audiencePreviewDtoSchema = z.object({
  total: z.number().int().nonnegative(),
  matched: z.number().int().nonnegative(),
  sample: z.array(audienceCustomerDtoSchema),
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
  tenureDays: number;
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
}

export interface AudiencePreview {
  total: number;
  matched: number;
  sample: AudienceCustomer[];
  piiMasked: boolean;
}
