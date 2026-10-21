import { ApiError } from '@/core/api/error';
import i18n from '@/core/i18n';
import { apiClient } from '@/core/api/apiClient';
import type { PageResponse } from '@/shared/types/pagination';

import {
  nonIotDeviceCountsDtoSchema,
  nonIotDeviceDtoSchema,
  nonIotDevicePageDtoSchema,
  type NonIotDevice,
  type NonIotDeviceCounts,
  type NonIotDeviceDto,
  type NonIotDeviceListFilters,
} from '../schemas/nonIotDeviceSchemas';

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

export function mapNonIotDevice(dto: NonIotDeviceDto): NonIotDevice {
  return {
    id: dto.device_id,
    modelName: dto.model_name,
    region: dto.region,
    ...(dto.ward && { ward: dto.ward }),
    ...(dto.owner_id && { ownerId: dto.owner_id }),
    batchCode: dto.batch_code,
    manufacturedAt: dto.manufactured_at,
    ...(dto.activated_at && { activatedAt: dto.activated_at }),
    warrantyStatus: dto.warranty_status,
    ...(dto.warranty_expires_at && {
      warrantyExpiresAt: dto.warranty_expires_at,
    }),
    filterLifePercent: dto.filter_life_percent,
  };
}

function filterParams(
  filters: Omit<NonIotDeviceListFilters, 'page' | 'pageSize'>
): URLSearchParams {
  const params = new URLSearchParams();
  const search = filters.search.trim();
  if (search) params.set('search', search);
  if (filters.region) params.set('region', filters.region);
  if (filters.warrantyStatus)
    params.set('warranty_status', filters.warrantyStatus);
  return params;
}

export async function getNonIotDevices(
  filters: NonIotDeviceListFilters,
  signal?: AbortSignal
): Promise<PageResponse<NonIotDevice>> {
  const params = filterParams(filters);
  params.set('page', String(filters.page));
  params.set('page_size', String(filters.pageSize));
  const response = await apiClient.get<unknown>(
    `/devices/non-iot?${params.toString()}`,
    { signal }
  );
  const parsed = nonIotDevicePageDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return {
    items: parsed.data.items.map(mapNonIotDevice),
    page: parsed.data.page,
    pageSize: parsed.data.page_size,
    total: parsed.data.total,
  };
}

// Warranty cards ignore the warranty filter itself, like the status cards.
export async function getNonIotDeviceCounts(
  filters: Pick<NonIotDeviceListFilters, 'search' | 'region'>,
  signal?: AbortSignal
): Promise<NonIotDeviceCounts> {
  const query = filterParams(filters).toString();
  const response = await apiClient.get<unknown>(
    query ? `/devices/non-iot/counts?${query}` : '/devices/non-iot/counts',
    { signal }
  );
  const parsed = nonIotDeviceCountsDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return {
    total: parsed.data.total,
    warrantyActive: parsed.data.warranty_active,
    warrantyExpiring: parsed.data.warranty_expiring,
    warrantyExpired: parsed.data.warranty_expired,
  };
}

export async function getNonIotDevice(
  deviceId: string,
  signal?: AbortSignal
): Promise<NonIotDevice> {
  const response = await apiClient.get<unknown>(
    `/devices/non-iot/${encodeURIComponent(deviceId)}`,
    { signal }
  );
  const parsed = nonIotDeviceDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapNonIotDevice(parsed.data);
}
