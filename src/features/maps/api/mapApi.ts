import type { z } from 'zod';

import { apiClient } from '@/core/api/apiClient';
import { ApiError } from '@/core/api/error';
import i18n from '@/core/i18n';

import { mapRegionDetail, mapRegions, mapSummary } from './mapMapper';
import {
  mapRegionDetailDtoSchema,
  mapRegionsDtoSchema,
  mapSummaryDtoSchema,
  type MapFilters,
  type MapRegionDetail,
  type MapRegions,
  type MapSummary,
} from '../schemas/mapSchemas';

function invalidResponse(error: z.ZodError): ApiError {
  return new ApiError(
    'invalidResponse',
    i18n.t('maps:errors.invalidResponse'),
    undefined,
    error.issues.map((issue) => ({
      code: issue.code,
      path: issue.path.map(String).join('.'),
    }))
  );
}

function getFilterParams(filters: MapFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.model) params.set('model', filters.model);
  if (filters.status) params.set('status', filters.status);
  if (filters.dateFrom) params.set('date_from', filters.dateFrom);
  if (filters.dateTo) params.set('date_to', filters.dateTo);
  return params;
}

function withQuery(path: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export async function getMapSummary(
  filters: MapFilters,
  signal?: AbortSignal
): Promise<MapSummary> {
  const raw = await apiClient.get<unknown>(
    withQuery('/device-map/summary', getFilterParams(filters)),
    { signal }
  );
  const parsed = mapSummaryDtoSchema.safeParse(raw);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapSummary(parsed.data);
}

export async function getMapRegions(
  filters: MapFilters,
  signal?: AbortSignal
): Promise<MapRegions> {
  const raw = await apiClient.get<unknown>(
    withQuery('/device-map/regions', getFilterParams(filters)),
    { signal }
  );
  const parsed = mapRegionsDtoSchema.safeParse(raw);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapRegions(parsed.data);
}

export async function getMapRegionDetail(
  regionId: string,
  signal?: AbortSignal
): Promise<MapRegionDetail> {
  const raw = await apiClient.get<unknown>(
    `/device-map/regions/${encodeURIComponent(regionId)}`,
    { signal }
  );
  const parsed = mapRegionDetailDtoSchema.safeParse(raw);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapRegionDetail(parsed.data);
}
