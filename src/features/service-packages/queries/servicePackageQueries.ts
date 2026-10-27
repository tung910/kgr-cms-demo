import { queryOptions } from '@tanstack/react-query';

import {
  getServicePackageStats,
  getServicePackages,
} from '../api/servicePackageApi';
import type { ServicePackageListFilters } from '../schemas/servicePackageSchemas';

export const servicePackageQueries = {
  all: ['service-packages'] as const,
  list: (filters: ServicePackageListFilters) =>
    queryOptions({
      queryKey: [...servicePackageQueries.all, 'list', filters] as const,
      queryFn: ({ signal }) => getServicePackages(filters, signal),
    }),
  // Whole-catalogue counts for the stat cards; key carries no filters.
  stats: () =>
    queryOptions({
      queryKey: [...servicePackageQueries.all, 'stats'] as const,
      queryFn: ({ signal }) => getServicePackageStats(signal),
    }),
};
