import { ApiError } from '@/core/api/error';
import i18n from '@/core/i18n';
import { apiClient } from '@/core/api/apiClient';

import { mapDashboardSummary } from './dashboardMapper';
import {
  dashboardActiveDtoSchema,
  dashboardSummaryDtoSchema,
  type DashboardActiveFilters,
  type DashboardActivePoint,
  type DashboardSummary,
} from '../schemas/dashboardSchemas';

function invalidResponse(error: {
  issues: Array<{ code: string; path: PropertyKey[] }>;
}): ApiError {
  return new ApiError(
    'invalidResponse',
    i18n.t('dashboard:errors.invalidResponse'),
    undefined,
    error.issues.map((issue) => ({
      code: issue.code,
      path: issue.path.map(String).join('.'),
    }))
  );
}

export async function getDashboardSummary(
  signal?: AbortSignal
): Promise<DashboardSummary> {
  const response = await apiClient.get<unknown>('/dashboard/summary', {
    signal,
  });
  const parsed = dashboardSummaryDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapDashboardSummary(parsed.data);
}

export async function getDashboardActive(
  filters: DashboardActiveFilters,
  signal?: AbortSignal
): Promise<DashboardActivePoint[]> {
  const params = new URLSearchParams({ granularity: filters.granularity });
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const response = await apiClient.get<unknown>(
    `/dashboard/active?${params.toString()}`,
    { signal }
  );
  const parsed = dashboardActiveDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return parsed.data.points;
}
