import { z } from 'zod';

export type DashboardMetricKey =
  'total' | 'errorRate' | 'tds' | 'active' | 'filters' | 'revenue';

export interface DashboardMetricTrend {
  direction: 'up' | 'down';
  percent: string;
  /** Whether a rising value is favourable for this metric. */
  positiveIsGood: boolean;
}

export interface DashboardMetric {
  key: DashboardMetricKey;
  value: string;
  unit?: string;
  trend: DashboardMetricTrend;
}

export interface DashboardTrendPoint {
  label: string;
  online: number;
  offline: number;
}

export interface DashboardRegionTds {
  region: string;
  tds: number;
}

export interface DashboardRevenuePoint {
  label: string;
  revenue: number;
  filters: number;
}

export interface DashboardSummary {
  updatedAt: string;
  metrics: DashboardMetric[];
  onlineTrend: DashboardTrendPoint[];
  tdsByRegion: DashboardRegionTds[];
  tdsThreshold: number;
  revenueTrend: DashboardRevenuePoint[];
}

const metricTrendDtoSchema = z.object({
  direction: z.enum(['up', 'down']),
  percent: z.string().min(1),
  positive_is_good: z.boolean(),
});

const metricDtoSchema = z.object({
  key: z.enum(['total', 'error_rate', 'tds', 'active', 'filters', 'revenue']),
  value: z.string().min(1),
  unit: z.string().optional(),
  trend: metricTrendDtoSchema,
});

const trendPointDtoSchema = z.object({
  label: z.string().min(1),
  online: z.number().int().nonnegative(),
  offline: z.number().int().nonnegative(),
});

const regionTdsDtoSchema = z.object({
  region: z.string().min(1),
  tds: z.number(),
});

const revenuePointDtoSchema = z.object({
  label: z.string().min(1),
  revenue: z.number(),
  filters: z.number(),
});

export const dashboardSummaryDtoSchema = z.object({
  updated_at: z.string().min(1),
  metrics: z.array(metricDtoSchema),
  online_trend: z.array(trendPointDtoSchema),
  tds_by_region: z.array(regionTdsDtoSchema),
  tds_threshold: z.number(),
  revenue_trend: z.array(revenuePointDtoSchema),
});

export type DashboardSummaryDto = z.infer<typeof dashboardSummaryDtoSchema>;
export type DashboardMetricDto = z.infer<typeof metricDtoSchema>;

// 1.4 is the only dashboard block with its own period controls.
export const ACTIVE_GRANULARITIES = ['week', 'month', 'year'] as const;
export const activeGranularitySchema = z.enum(ACTIVE_GRANULARITIES);
export type ActiveGranularity = z.infer<typeof activeGranularitySchema>;

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// Route search for `/`; every field falls back to undefined on a bad URL.
export const dashboardSearchSchema = z.object({
  granularity: activeGranularitySchema.optional().catch(undefined),
  from: isoDateSchema.optional().catch(undefined),
  to: isoDateSchema.optional().catch(undefined),
});
export type DashboardSearch = z.infer<typeof dashboardSearchSchema>;

export interface DashboardActiveFilters {
  granularity: ActiveGranularity;
  from?: string;
  to?: string;
}

export interface DashboardActivePoint {
  label: string;
  customers: number;
  devices: number;
}

export const dashboardActiveDtoSchema = z.object({
  granularity: activeGranularitySchema,
  points: z.array(
    z.object({
      label: z.string().min(1),
      customers: z.number().int().nonnegative(),
      devices: z.number().int().nonnegative(),
    })
  ),
});
export type DashboardActiveDto = z.infer<typeof dashboardActiveDtoSchema>;
