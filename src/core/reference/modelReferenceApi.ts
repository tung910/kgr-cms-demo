import { z } from 'zod';

import { ApiError } from '@/core/api/error';
import { apiClient } from '@/core/api/apiClient';

// Models are declared in the business-vertical system, not in this portal
// (spec §1.3). The portal only reads the catalogue to filter lists and to
// attach core lifecycle config (M04.1) to an existing model.
export interface ModelReference {
  id: string;
  code: string;
  name: string;
  industry: string;
  // Hardware the model physically has — decides which remote commands exist
  // at all (M03), independent of who is looking.
  features: {
    hasHotTank: boolean;
    hasColdTank: boolean;
    supportsMembraneFlush: boolean;
  };
}

const modelReferenceDtoSchema = z.object({
  model_id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  industry: z.string().min(1),
  has_hot_tank: z.boolean(),
  has_cold_tank: z.boolean(),
  supports_membrane_flush: z.boolean(),
});

const modelReferenceListDtoSchema = z.array(modelReferenceDtoSchema);

export async function getModelReferences(
  signal?: AbortSignal
): Promise<ModelReference[]> {
  const response = await apiClient.get<unknown>('/catalog/models', { signal });
  const parsed = modelReferenceListDtoSchema.safeParse(response);

  if (!parsed.success) {
    throw new ApiError(
      'invalidResponse',
      'The server returned an invalid model reference response.',
      undefined,
      parsed.error.issues.map((issue) => ({
        code: issue.code,
        path: issue.path.map(String).join('.'),
      }))
    );
  }

  return parsed.data.map((dto) => ({
    id: dto.model_id,
    code: dto.code,
    name: dto.name,
    industry: dto.industry,
    features: {
      hasHotTank: dto.has_hot_tank,
      hasColdTank: dto.has_cold_tank,
      supportsMembraneFlush: dto.supports_membrane_flush,
    },
  }));
}
