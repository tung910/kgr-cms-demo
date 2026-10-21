import { queryOptions } from '@tanstack/react-query';

import { getInventoryCounts, getInventoryDevices } from '../api/inventoryApi';
import type { InventoryListFilters } from '../schemas/inventorySchemas';
import { deviceQueries } from './deviceQueries';

// Unused stock ("Tồn kho" tab). Keys live under deviceQueries.all so a
// device mutation still invalidates them.
export const inventoryQueries = {
  list: (filters: InventoryListFilters) =>
    queryOptions({
      queryKey: [...deviceQueries.all, 'inventory', 'list', filters] as const,
      queryFn: ({ signal }) => getInventoryDevices(filters, signal),
    }),
  counts: (filters: InventoryListFilters) => {
    const countFilters = {
      search: filters.search,
      model: filters.model,
    };
    return queryOptions({
      queryKey: [
        ...deviceQueries.all,
        'inventory',
        'counts',
        countFilters,
      ] as const,
      queryFn: ({ signal }) => getInventoryCounts(countFilters, signal),
    });
  },
};
