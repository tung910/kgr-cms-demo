import { ApiError } from '@/core/api/error';
import { apiClient } from '@/core/api/apiClient';

import { mapCoreLifecycleConfig } from './coreLifecycleMapper';
import {
  coreLifecycleConfigDtoSchema,
  type CoreLifecycleConfig,
  type CoreTypeUpdate,
} from '../schemas/coreLifecycleSchemas';

function invalidResponse(error: {
  issues: Array<{ code: string; path: PropertyKey[] }>;
}): ApiError {
  return new ApiError(
    'invalidResponse',
    'The server returned an invalid core lifecycle config response.',
    undefined,
    error.issues.map((issue) => ({
      code: issue.code,
      path: issue.path.map(String).join('.'),
    }))
  );
}

function parseConfig(response: unknown): CoreLifecycleConfig {
  const parsed = coreLifecycleConfigDtoSchema.safeParse(response);
  if (!parsed.success) throw invalidResponse(parsed.error);
  return mapCoreLifecycleConfig(parsed.data);
}

export async function getCoreLifecycleConfig(
  signal?: AbortSignal
): Promise<CoreLifecycleConfig> {
  return parseConfig(
    await apiClient.get<unknown>('/serials/core-config', { signal })
  );
}

// The server computes the before/after audit entries itself, so the portal
// only sends the new values and the reason.
export async function updateCoreType(
  input: CoreTypeUpdate
): Promise<CoreLifecycleConfig> {
  const response = await apiClient.put<unknown>(
    `/serials/core-types/${encodeURIComponent(input.code)}`,
    {
      standard_months: input.standardMonths,
      standard_hours: input.standardHours,
      floor_percent: input.floorPercent,
      reason: input.reason,
    }
  );
  return parseConfig(response);
}
