import { queryOptions } from '@tanstack/react-query';

import {
  getMapRegionDetail,
  getMapRegions,
  getMapSummary,
} from '../api/mapApi';
import type { MapFilters } from '../schemas/mapSchemas';

export const mapQueries = {
  all: ['device-map'] as const,
  summary: (filters: MapFilters) =>
    queryOptions({
      queryKey: [...mapQueries.all, 'summary', filters] as const,
      queryFn: ({ signal }) => getMapSummary(filters, signal),
    }),
  regions: (filters: MapFilters) =>
    queryOptions({
      queryKey: [...mapQueries.all, 'regions', filters] as const,
      queryFn: ({ signal }) => getMapRegions(filters, signal),
    }),
  regionDetail: (regionId: string) =>
    queryOptions({
      queryKey: [...mapQueries.all, 'region', regionId] as const,
      queryFn: ({ signal }) => getMapRegionDetail(regionId, signal),
    }),
};
