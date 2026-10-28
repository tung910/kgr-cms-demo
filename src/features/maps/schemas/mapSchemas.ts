import { z } from 'zod';

import {
  MAP_REGION_STATUS_VALUES,
  type MapRegionStatus,
} from '@/shared/constants/mapRegionStatus';

export const mapRegionLevelSchema = z.enum(['province', 'district']);
export type MapRegionLevel = z.infer<typeof mapRegionLevelSchema>;

// Machine key for the business insight; the text is translated at render time.
export const mapRegionInsightSchema = z.enum([
  'stable',
  'high_tds',
  'low_coverage',
]);
export type MapRegionInsight = z.infer<typeof mapRegionInsightSchema>;

export const mapRegionDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: mapRegionLevelSchema,
  parent_id: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
  device_count: z.number().int().nonnegative(),
  avg_tds: z.number().nonnegative(),
  status: z.enum(MAP_REGION_STATUS_VALUES),
  insight: mapRegionInsightSchema,
});
export type MapRegionDto = z.infer<typeof mapRegionDtoSchema>;

export const mapRegionsDtoSchema = z.object({
  regions: z.array(mapRegionDtoSchema),
  tds_threshold: z.number().positive(),
  models: z.array(z.string()),
  // Whether the caller may see exact install locations (spec §5.5).
  exact_location: z.boolean(),
});
export type MapRegionsDto = z.infer<typeof mapRegionsDtoSchema>;

export const mapSiteDtoSchema = z.object({
  id: z.string(),
  lat: z.number(),
  lng: z.number(),
  address: z.string(),
});

export const mapRegionDetailDtoSchema = mapRegionDtoSchema.extend({
  sites: z.array(mapSiteDtoSchema),
});
export type MapRegionDetailDto = z.infer<typeof mapRegionDetailDtoSchema>;

export const mapSummaryDtoSchema = z.object({
  total_devices: z.number().int().nonnegative(),
  region_count: z.number().int().nonnegative(),
  alert_region_count: z.number().int().nonnegative(),
  avg_tds: z.number().nonnegative(),
});
export type MapSummaryDto = z.infer<typeof mapSummaryDtoSchema>;

export interface MapRegion {
  id: string;
  name: string;
  level: MapRegionLevel;
  parentId: string | null;
  lat: number;
  lng: number;
  deviceCount: number;
  avgTds: number;
  status: MapRegionStatus;
  insight: MapRegionInsight;
}

export interface MapSite {
  id: string;
  lat: number;
  lng: number;
  address: string;
}

export interface MapRegionDetail extends MapRegion {
  sites: MapSite[];
}

export interface MapRegions {
  regions: MapRegion[];
  tdsThreshold: number;
  models: string[];
  exactLocation: boolean;
}

export interface MapSummary {
  totalDevices: number;
  regionCount: number;
  alertRegionCount: number;
  avgTds: number;
}

export interface MapFilters {
  model?: string;
  status?: MapRegionStatus;
  dateFrom?: string;
  dateTo?: string;
}
