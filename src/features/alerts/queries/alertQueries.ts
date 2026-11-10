import { queryOptions } from '@tanstack/react-query';
import {
  getAlert,
  getAlertCounts,
  getAlertFilterOptions,
  getAlerts,
  getTechnicianSuggestions,
} from '../api/alertApi';
import type {
  AlertListFilters,
  TechnicianSuggestionParams,
} from '../schemas/alertSchemas';

export const alertQueries = {
  all: ['alerts'] as const,
  list: (filters: AlertListFilters) =>
    queryOptions({
      queryKey: ['alerts', 'list', filters] as const,
      queryFn: ({ signal }) => getAlerts(filters, signal),
      refetchInterval: 15_000,
    }),
  counts: (filters: AlertListFilters) => {
    const countFilters = {
      search: filters.search,
      severity: filters.severity,
      group: filters.group,
      region: filters.region,
      model: filters.model,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      includeClosed: filters.includeClosed,
    };
    return queryOptions({
      queryKey: ['alerts', 'counts', countFilters] as const,
      queryFn: ({ signal }) => getAlertCounts(filters, signal),
      refetchInterval: 15_000,
    });
  },
  filterOptions: () =>
    queryOptions({
      queryKey: ['alerts', 'filter-options'] as const,
      queryFn: ({ signal }) => getAlertFilterOptions(signal),
      staleTime: 5 * 60 * 1000,
    }),
  detail: (alertId: string) =>
    queryOptions({
      queryKey: ['alerts', 'detail', alertId] as const,
      queryFn: ({ signal }) => getAlert(alertId, signal),
      refetchInterval: 15_000,
    }),
  technicianSuggestions: (params: TechnicianSuggestionParams) =>
    queryOptions({
      queryKey: ['alerts', 'technician-suggestions', params] as const,
      queryFn: ({ signal }) => getTechnicianSuggestions(params, signal),
    }),
};
