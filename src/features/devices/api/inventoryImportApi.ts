import { z } from 'zod';
import { apiClient } from '@/core/api/apiClient';
import { ApiError } from '@/core/api/error';
import i18n from '@/core/i18n';
import {
  inventoryImportPreviewDtoSchema,
  inventoryImportPackageOptionsDtoSchema,
  inventoryImportResultDtoSchema,
  inventoryImportSourceSchema,
  inventoryImportConfirmDtoSchema,
  type InventoryImportSource,
  type InventoryImportConfirmInput,
  type InventoryImportPackageOption,
} from '../schemas/inventoryImportSchemas';
import {
  mapInventoryImportPreview,
  mapInventoryImportResult,
} from './inventoryImportMapper';

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new ApiError(
      'invalidResponse',
      i18n.t('devices:errors.invalidResponse')
    );
  return parsed.data;
}
export async function previewInventoryImport(input: InventoryImportSource) {
  const raw = await apiClient.post<unknown>(
    '/devices/inventory/import/preview',
    inventoryImportSourceSchema.parse(input)
  );
  return mapInventoryImportPreview(parse(inventoryImportPreviewDtoSchema, raw));
}
export async function getInventoryImportPackageOptions(
  signal?: AbortSignal
): Promise<InventoryImportPackageOption[]> {
  const raw = await apiClient.get<unknown>(
    '/devices/inventory/import/package-options',
    { signal }
  );
  return parse(inventoryImportPackageOptionsDtoSchema, raw).map((option) => ({
    id: option.id,
    code: option.code,
    name: option.name,
    benefits: option.benefits.map((benefit) => ({
      id: benefit.id,
      code: benefit.code,
      name: benefit.name,
      quota: benefit.quota,
      termMonths: benefit.term_months,
    })),
  }));
}
export async function confirmInventoryImport(
  input: InventoryImportConfirmInput,
  operationKey: string
) {
  const body = inventoryImportConfirmDtoSchema.parse({
    preview_id: input.previewId,
    assignments: input.assignments.map((row) => ({
      row_id: row.rowId,
      package_ids: row.packageIds,
    })),
  });
  const raw = await apiClient.post<unknown>(
    '/devices/inventory/import/confirm',
    body,
    { headers: { 'Idempotency-Key': operationKey } }
  );
  return mapInventoryImportResult(parse(inventoryImportResultDtoSchema, raw));
}
