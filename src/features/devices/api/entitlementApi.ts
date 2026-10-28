import { ApiError } from '@/core/api/error';
import i18n from '@/core/i18n';
import { apiClient } from '@/core/api/apiClient';
import type { PageResponse } from '@/shared/types/pagination';

import { mapEntitlement, mapEntitlementEventPage } from './entitlementMapper';
import {
  entitlementDtoSchema,
  entitlementEventPageDtoSchema,
  type Entitlement,
  type EntitlementEvent,
} from '../schemas/entitlementSchemas';

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

export async function getDeviceEntitlements(
  deviceId: string,
  signal?: AbortSignal
): Promise<Entitlement[]> {
  const response = await apiClient.get<unknown>(
    `/devices/${encodeURIComponent(deviceId)}/entitlements`,
    { signal }
  );
  const parsed = entitlementDtoSchema.array().safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return parsed.data.map(mapEntitlement);
}

export async function getEntitlementEvents(
  entitlementId: string,
  page: number,
  signal?: AbortSignal
): Promise<PageResponse<EntitlementEvent>> {
  const params = new URLSearchParams();
  if (page > 0) params.set('page', String(page));
  const response = await apiClient.get<unknown>(
    `/entitlements/${encodeURIComponent(entitlementId)}/events?${params.toString()}`,
    { signal }
  );
  const parsed = entitlementEventPageDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapEntitlementEventPage(parsed.data);
}
