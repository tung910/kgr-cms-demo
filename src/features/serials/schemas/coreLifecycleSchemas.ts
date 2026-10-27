import { z } from 'zod';

import {
  DISTRIBUTION_REGION_VALUES,
  type DistributionRegion,
} from '@/shared/constants/distributionRegion';

// 9.3 per docs/prototypes/core-lifespan-config.html: each core type carries a
// standard lifespan (filter hours + months of device operation, whichever
// runs out first), a floor (fixed yellow/red warning thresholds live in
// utils/coreLifespan.ts); each QR batch confirms or shortens it within
// [floor, standard]. A core locks its lifespan when it is activated, so later
// edits never change cores already in use (no retroactive effect). The core
// type catalog itself comes from product data; the portal only edits it.

export interface CoreType {
  code: string;
  name: string;
  group: string;
  usualPosition: string;
  standardMonths: number;
  standardHours: number;
  floorPercent: number;
}

// Reference data shown while confirming a batch: water map TDS and how early
// customers in the region replace cores (QR activation history).
export interface RegionInsight {
  region: DistributionRegion;
  avgTdsPpm: number;
  earlyReplacePercent: number;
}

export const AUDIT_TARGET_KINDS = ['core_type', 'batch'] as const;
export type AuditTargetKind = (typeof AUDIT_TARGET_KINDS)[number];

// `field` is a stable key translated at render time; region and status
// values are stored as their codes for the same reason.
export interface CoreLifecycleAuditEntry {
  id: string;
  actor: string;
  changedAt: string;
  targetKind: AuditTargetKind;
  target: string;
  field: string;
  beforeValue: string;
  afterValue: string;
  reason: string;
}

export interface CoreLifecycleConfig {
  coreTypes: CoreType[];
  regionInsights: RegionInsight[];
  auditLog: CoreLifecycleAuditEntry[];
}

export interface CoreTypeUpdate {
  code: string;
  standardMonths: number;
  standardHours: number;
  floorPercent: number;
  reason: string;
}

export const coreTypeDtoSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  group: z.string().min(1),
  usual_position: z.string().min(1),
  standard_months: z.number().int().positive(),
  standard_hours: z.number().int().positive(),
  floor_percent: z.number().min(0).max(100),
});

export const regionInsightDtoSchema = z.object({
  region: z.enum(DISTRIBUTION_REGION_VALUES),
  avg_tds_ppm: z.number().nonnegative(),
  early_replace_percent: z.number().min(0).max(100),
});

export const coreLifecycleAuditEntryDtoSchema = z.object({
  id: z.string().min(1),
  actor: z.string().min(1),
  changed_at: z.string().datetime({ offset: true }),
  target_kind: z.enum(AUDIT_TARGET_KINDS),
  target: z.string().min(1),
  field: z.string().min(1),
  before_value: z.string(),
  after_value: z.string(),
  reason: z.string(),
});

export const coreLifecycleConfigDtoSchema = z.object({
  core_types: z.array(coreTypeDtoSchema),
  region_insights: z.array(regionInsightDtoSchema),
  audit_log: z.array(coreLifecycleAuditEntryDtoSchema),
});

export type CoreLifecycleConfigDto = z.infer<
  typeof coreLifecycleConfigDtoSchema
>;
export type CoreTypeDto = z.infer<typeof coreTypeDtoSchema>;
export type CoreLifecycleAuditEntryDto = z.infer<
  typeof coreLifecycleAuditEntryDtoSchema
>;
