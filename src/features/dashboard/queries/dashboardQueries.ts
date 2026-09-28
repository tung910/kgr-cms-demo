import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import { getDashboardActive, getDashboardSummary } from '../api/dashboardApi';
import type { DashboardActiveFilters } from '../schemas/dashboardSchemas';

export const dashboardQueries = {
  all: ['dashboard'] as const,
  summary: () =>
    queryOptions({
      queryKey: [...dashboardQueries.all, 'summary'] as const,
      // Header shows a "live" badge — keep the KPIs reasonably fresh.
      refetchInterval: 30_000,
      queryFn: ({ signal }) => getDashboardSummary(signal),
    }),
  active: (filters: DashboardActiveFilters) =>
    queryOptions({
      queryKey: [...dashboardQueries.all, 'active', filters] as const,
      queryFn: ({ signal }) => getDashboardActive(filters, signal),
      // Keep the old bars on screen while a new period loads.
      placeholderData: keepPreviousData,
    }),
};
