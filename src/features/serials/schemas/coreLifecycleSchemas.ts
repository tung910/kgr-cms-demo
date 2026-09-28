import { z } from 'zod';

// M04.1 cascade: core SKU (lifespan + thresholds) -> model layout (positions
// and compatible SKUs, no lifespan) -> per-device TDS factor -> campaign
// (push content only). The SKU catalog itself comes from the business
// product-line data; the portal only edits its attributes.

export const CORE_KINDS = ['standard', 'poor_water'] as const;
export type CoreKind = (typeof CORE_KINDS)[number];

export interface CoreTdsFactor {
  minPpm: number;
  maxPpm?: number;
  factor: number;
}

export interface CoreSku {
  sku: string;
  name: string;
  kind: CoreKind;
  lifespanMonths: number;
  lifespanLiters: number;
  warningLevel1Percent: number;
  warningLevel2Percent: number;
  guideVideoUrl?: string;
  saleRegions: string[];
  tdsFactors: CoreTdsFactor[];
}

export interface CorePosition {
  position: string;
  name: string;
  compatibleSkus: string[];
  defaultSku: string;
}

export interface CoreModelLayout {
  modelId: string;
  positions: CorePosition[];
}

export interface CoreLifecycleCampaign {
  id: string;
  name: string;
  sku?: string;
  region?: string;
  pushContent: string;
  ctaLabel: string;
  deeplink: string;
  startsAt: string;
  endsAt: string;
}

export interface CoreLifecycleAuditEntry {
  id: string;
  actor: string;
  changedAt: string;
  field: string;
  beforeValue: string;
  afterValue: string;
}

export interface CoreLifecycleAuditChange {
  field: string;
  beforeValue: string;
  afterValue: string;
}

export interface CoreLifecycleConfig {
  cores: CoreSku[];
  modelLayouts: CoreModelLayout[];
  campaigns: CoreLifecycleCampaign[];
  auditLog: CoreLifecycleAuditEntry[];
}

const percentSchema = z.number().min(0).max(100);

export const coreTdsFactorDtoSchema = z.object({
  min_ppm: z.number().min(0),
  max_ppm: z.number().positive().optional(),
  factor: z.number().positive(),
});

export const coreSkuDtoSchema = z
  .object({
    sku: z.string().min(1),
    name: z.string().min(1),
    kind: z.enum(CORE_KINDS),
    lifespan_months: z.number().int().positive(),
    lifespan_liters: z.number().positive(),
    warning_level1_percent: percentSchema,
    warning_level2_percent: percentSchema,
    guide_video_url: z.string().url().optional(),
    sale_regions: z.array(z.string().min(1)),
    tds_factors: z.array(coreTdsFactorDtoSchema),
  })
  .refine((core) => core.warning_level2_percent > core.warning_level1_percent, {
    path: ['warning_level2_percent'],
    message: 'Level 2 threshold must be above level 1.',
  });

export const corePositionDtoSchema = z
  .object({
    position: z.string().min(1),
    name: z.string().min(1),
    compatible_skus: z.array(z.string().min(1)).min(1),
    default_sku: z.string().min(1),
  })
  .refine(
    (position) => position.compatible_skus.includes(position.default_sku),
    {
      path: ['default_sku'],
      message: 'Default SKU must be one of the compatible SKUs.',
    }
  );

export const coreModelLayoutDtoSchema = z.object({
  model_id: z.string().min(1),
  positions: z.array(corePositionDtoSchema),
});

export const coreLifecycleCampaignDtoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sku: z.string().optional(),
  region: z.string().optional(),
  push_content: z.string().min(1),
  cta_label: z.string().min(1),
  deeplink: z.string().min(1),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
});

export const coreLifecycleAuditEntryDtoSchema = z.object({
  id: z.string().min(1),
  actor: z.string().min(1),
  changed_at: z.string().datetime({ offset: true }),
  field: z.string().min(1),
  before_value: z.string(),
  after_value: z.string(),
});

export const coreLifecycleConfigDtoSchema = z.object({
  cores: z.array(coreSkuDtoSchema),
  model_layouts: z.array(coreModelLayoutDtoSchema),
  campaigns: z.array(coreLifecycleCampaignDtoSchema),
  audit_log: z.array(coreLifecycleAuditEntryDtoSchema),
});

export type CoreLifecycleConfigDto = z.infer<
  typeof coreLifecycleConfigDtoSchema
>;
export type CoreSkuDto = z.infer<typeof coreSkuDtoSchema>;
export type CoreModelLayoutDto = z.infer<typeof coreModelLayoutDtoSchema>;
export type CoreLifecycleCampaignDto = z.infer<
  typeof coreLifecycleCampaignDtoSchema
>;
export type CoreLifecycleAuditEntryDto = z.infer<
  typeof coreLifecycleAuditEntryDtoSchema
>;
