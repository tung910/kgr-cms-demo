import { ApiError } from '@/core/api/error';
import i18n from '@/core/i18n';
import { apiClient } from '@/core/api/apiClient';
import type { PageResponse } from '@/shared/types/pagination';

import { mapDevice, mapDevicePage } from './deviceMapper';
import {
  deviceDtoSchema,
  devicePageDtoSchema,
  deviceStatusCountsDtoSchema,
  type DeleteDeviceInput,
  type Device,
  type DeviceCountFilters,
  type DeviceListFilters,
  type DeviceStatusCounts,
  type RestoreDeviceInput,
  type SetLifecycleStateInput,
} from '../schemas/deviceSchemas';

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

function getDeviceFilterParams(filters: DeviceCountFilters): URLSearchParams {
  const params = new URLSearchParams();
  const search = filters.search.trim();
  const model = filters.model?.trim();
  const region = filters.region?.trim();
  const customerId = filters.customerId?.trim();

  if (search) params.set('search', search);
  if (model) params.set('model', model);
  if (region) params.set('region', region);
  if (customerId) params.set('customer_id', customerId);
  return params;
}

function getDeviceListPath(filters: DeviceListFilters): string {
  const params = getDeviceFilterParams(filters);
  if (filters.status) params.set('status', filters.status);
  if (filters.page > 0) params.set('page', String(filters.page));
  if (filters.pageSize > 0) params.set('page_size', String(filters.pageSize));
  return `/devices?${params.toString()}`;
}

export async function getDeviceStatusCounts(
  filters: DeviceCountFilters,
  signal?: AbortSignal
): Promise<DeviceStatusCounts> {
  const query = getDeviceFilterParams(filters).toString();
  const response = await apiClient.get<unknown>(
    query ? `/devices/status-counts?${query}` : '/devices/status-counts',
    { signal }
  );
  const parsed = deviceStatusCountsDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return parsed.data;
}

async function parseDeviceResponse(response: unknown): Promise<Device> {
  const parsed = deviceDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapDevice(parsed.data);
}

export async function getDevices(
  filters: DeviceListFilters,
  signal?: AbortSignal
): Promise<PageResponse<Device>> {
  const response = await apiClient.get<unknown>(getDeviceListPath(filters), {
    signal,
  });
  const parsed = devicePageDtoSchema.safeParse(response);

  if (!parsed.success) throw invalidResponse(parsed.error);

  return mapDevicePage(parsed.data);
}

export async function getDevice(
  deviceId: string,
  signal?: AbortSignal
): Promise<Device> {
  const response = await apiClient.get<unknown>(
    `/devices/${encodeURIComponent(deviceId)}`,
    {
      signal,
    }
  );

  return parseDeviceResponse(response);
}

function auditChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>
) {
  return Object.entries(after).map(([field, value]) => ({
    field,
    before_value: JSON.stringify(before[field] ?? null),
    after_value: JSON.stringify(value ?? null),
  }));
}

export async function setDeviceLifecycleState(
  device: Device,
  input: SetLifecycleStateInput
): Promise<Device> {
  return parseDeviceResponse(
    await apiClient.post<unknown>(
      '/devices/' + encodeURIComponent(device.id) + '/lifecycle-state',
      {
        lifecycle_state: input.lifecycleState,
        reason: input.reason,
        changes: auditChanges(
          { lifecycle_state: device.lifecycleState },
          { lifecycle_state: input.lifecycleState }
        ),
      }
    )
  );
}

export async function deleteDevice(
  device: Device,
  input: DeleteDeviceInput
): Promise<void> {
  // POST preserves the required reason; the transport DELETE has no request body.
  await apiClient.post<unknown>(
    '/devices/' + encodeURIComponent(device.id) + '/delete',
    {
      reason: input.reason,
      changes: auditChanges({ deleted: false }, { deleted: true }),
    }
  );
}

export async function restoreDevice(
  device: Device,
  input: RestoreDeviceInput
): Promise<Device> {
  return parseDeviceResponse(
    await apiClient.post<unknown>(
      '/devices/' + encodeURIComponent(device.id) + '/restore',
      {
        reason: input.reason,
        changes: auditChanges(
          { lifecycle_state: device.lifecycleState, owner: device.owner },
          { lifecycle_state: 'active' }
        ),
      }
    )
  );
}

// ponytail: fetches every page of the current filter client-side and builds
// the CSV synchronously. Fine at the current mock scale (36 devices); a
// >10,000-row export needs the async job + export tray described in the
// spec (POR-014/POR-029) instead of blocking the tab on one request loop.
export async function getAllDevices(
  filters: DeviceListFilters,
  signal?: AbortSignal
): Promise<Device[]> {
  const items: Device[] = [];
  let page = 1;
  while (true) {
    const result = await getDevices(
      { ...filters, page, pageSize: 100 },
      signal
    );
    items.push(...result.items);
    if (items.length >= result.total || result.items.length === 0) return items;
    page += 1;
  }
}
