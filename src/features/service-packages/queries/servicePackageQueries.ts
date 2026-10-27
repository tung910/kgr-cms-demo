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
  components: () =>
    queryOptions({
      queryKey: [...servicePackageQueries.all, 'components'] as const,
      queryFn: async ({ signal }) => {
        const items = [];
        let page = 1;
        while (true) {
          const result = await getServicePackages(
            { search: '', status: 'active', page, pageSize: 50 },
            signal
          );
          items.push(...result.items.filter((item) => item.group !== 'bundle'));
          if (page * result.pageSize >= result.total || !result.items.length)
            return items;
          page += 1;
        }
      },
    }),
  // Whole-catalogue counts for the stat cards; key carries no filters.
  stats: () =>
    queryOptions({
      queryKey: [...servicePackageQueries.all, 'stats'] as const,
      queryFn: ({ signal }) => getServicePackageStats(signal),
    }),
};
