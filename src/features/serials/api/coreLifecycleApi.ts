import { ApiError } from '@/core/api/error';
import { apiClient } from '@/core/api/apiClient';

import {
  mapCampaignsToDto,
  mapCoreLifecycleConfig,
  mapCoresToDto,
  mapModelLayoutsToDto,
} from './coreLifecycleMapper';
import {
  coreLifecycleConfigDtoSchema,
  type CoreLifecycleAuditChange,
  type CoreLifecycleCampaign,
  type CoreLifecycleConfig,
  type CoreModelLayout,
  type CoreSku,
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

export interface UpdateCoreLifecycleConfigInput {
  cores?: CoreSku[];
  modelLayouts?: CoreModelLayout[];
  campaigns?: CoreLifecycleCampaign[];
  changes: CoreLifecycleAuditChange[];
}

export async function updateCoreLifecycleConfig(
  input: UpdateCoreLifecycleConfigInput
): Promise<CoreLifecycleConfig> {
  const response = await apiClient.put<unknown>('/serials/core-config', {
    ...(input.cores && { cores: mapCoresToDto(input.cores) }),
    ...(input.modelLayouts && {
      model_layouts: mapModelLayoutsToDto(input.modelLayouts),
    }),
    ...(input.campaigns && { campaigns: mapCampaignsToDto(input.campaigns) }),
    changes: input.changes.map((change) => ({
      field: change.field,
      before_value: change.beforeValue,
      after_value: change.afterValue,
    })),
  });
  return parseConfig(response);
}
