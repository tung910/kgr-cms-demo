import { ApiError } from '@/core/api/error';
import i18n from '@/core/i18n';
import { apiClient } from '@/core/api/apiClient';
import type { PageResponse } from '@/shared/types/pagination';

import { mapInventoryCounts, mapInventoryDevicePage } from './inventoryMapper';
import {
  inventoryCountsDtoSchema,
  inventoryDevicePageDtoSchema,
  inventorySyncResultDtoSchema,
  type InventoryCountFilters,
  type InventoryCounts,
  type InventoryDevice,
  type InventoryListFilters,
  type InventorySyncResult,
} from '../schemas/inventorySchemas';

function invalidResponse(error: {
  issues: Array<{ code: string; path: PropertyKey[] }>;
}): ApiError {
  return new ApiError(
    'invalidResponse',
    i18n.t('devices:errors.invalidResponse'),
    undefined,
    error.issues.map((issue) => ({
      code: issue.code,
      path: issue.path.map(String).join('.'),
    }))
  );
}

function getInventoryFilterParams(
  filters: InventoryCountFilters
): URLSearchParams {
  const params = new URLSearchParams();
  const search = filters.search.trim();
  const model = filters.model?.trim();

  if (search) params.set('search', search);
  if (model) params.set('model', model);
  return params;
}

export async function getInventoryDevices(
  filters: InventoryListFilters,
  signal?: AbortSignal
): Promise<PageResponse<InventoryDevice>> {
  const params = getInventoryFilterParams(filters);
  if (filters.page > 0) params.set('page', String(filters.page));
  if (filters.pageSize > 0) params.set('page_size', String(filters.pageSize));

  const response = await apiClient.get<unknown>(
    `/devices/inventory?${params.toString()}`,
    { signal }
  );
  const parsed = inventoryDevicePageDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapInventoryDevicePage(parsed.data);
}

export async function getInventoryCounts(
  filters: InventoryCountFilters,
  signal?: AbortSignal
): Promise<InventoryCounts> {
  const query = getInventoryFilterParams(filters).toString();
  const response = await apiClient.get<unknown>(
    query ? `/devices/inventory/counts?${query}` : '/devices/inventory/counts',
    { signal }
  );
  const parsed = inventoryCountsDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapInventoryCounts(parsed.data);
}

export async function syncInventory(): Promise<InventorySyncResult> {
  const response = await apiClient.post<unknown>('/devices/inventory/sync', {});
  const parsed = inventorySyncResultDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return {
    syncedAt: parsed.data.synced_at,
    added: parsed.data.added,
    updated: parsed.data.updated,
    entitlementsAttached: parsed.data.entitlements_attached ?? 0,
  };
}
