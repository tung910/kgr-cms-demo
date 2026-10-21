import { queryOptions } from '@tanstack/react-query';

import { getInventoryCounts, getInventoryDevices } from '../api/inventoryApi';
import {
  getNonIotDevice,
  getNonIotDeviceCounts,
  getNonIotDevices,
} from '../api/nonIotDeviceApi';
import type { InventoryListFilters } from '../schemas/inventorySchemas';
import type { NonIotDeviceListFilters } from '../schemas/nonIotDeviceSchemas';
import { deviceQueries } from './deviceQueries';

// Unused stock ("Tồn kho" tab) and sold non-IoT units. Keys live under
// deviceQueries.all so a device mutation still invalidates them.
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
      connectivity: filters.connectivity,
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

export const nonIotDeviceQueries = {
  list: (filters: NonIotDeviceListFilters) =>
    queryOptions({
      queryKey: [...deviceQueries.all, 'non-iot', 'list', filters] as const,
      queryFn: ({ signal }) => getNonIotDevices(filters, signal),
    }),
  counts: (filters: Pick<NonIotDeviceListFilters, 'search' | 'region'>) => {
    const countFilters = { search: filters.search, region: filters.region };
    return queryOptions({
      queryKey: [
        ...deviceQueries.all,
        'non-iot',
        'counts',
        countFilters,
      ] as const,
      queryFn: ({ signal }) => getNonIotDeviceCounts(countFilters, signal),
    });
  },
  detail: (deviceId: string) =>
    queryOptions({
      queryKey: [...deviceQueries.all, 'non-iot', 'detail', deviceId] as const,
      queryFn: ({ signal }) => getNonIotDevice(deviceId, signal),
    }),
};
