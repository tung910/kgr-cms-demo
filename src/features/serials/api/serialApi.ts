import { ApiError } from '@/core/api/error';
import { apiClient } from '@/core/api/apiClient';
import type { PageResponse } from '@/shared/types/pagination';

import { mapSerialBatch, mapSerialPage } from './serialMapper';
import {
  serialBatchListDtoSchema,
  serialIngestResultDtoSchema,
  serialPageDtoSchema,
  type Serial,
  type SerialBatch,
  type SerialIngestResult,
  type SerialListFilters,
} from '../schemas/serialSchemas';

function invalidResponse(error: {
  issues: Array<{ code: string; path: PropertyKey[] }>;
}): ApiError {
  return new ApiError(
    'invalidResponse',
    'The server returned an invalid serial response.',
    undefined,
    error.issues.map((issue) => ({
      code: issue.code,
      path: issue.path.map(String).join('.'),
    }))
  );
}

function getSerialListPath(filters: SerialListFilters): string {
  const params = new URLSearchParams();
  const search = filters.search.trim();

  if (search) params.set('search', search);
  if (filters.modelCode) params.set('model_code', filters.modelCode);
  if (filters.batchId) params.set('batch_id', filters.batchId);
  if (filters.status) params.set('status', filters.status);
  params.set('page', String(filters.page));
  params.set('page_size', String(filters.pageSize));

  return `/serials?${params.toString()}`;
}

export async function getSerials(
  filters: SerialListFilters,
  signal?: AbortSignal
): Promise<PageResponse<Serial>> {
  const response = await apiClient.get<unknown>(getSerialListPath(filters), {
    signal,
  });
  const parsed = serialPageDtoSchema.safeParse(response);

  if (!parsed.success) throw invalidResponse(parsed.error);

  return mapSerialPage(parsed.data);
}

export async function getSerialBatches(
  signal?: AbortSignal
): Promise<SerialBatch[]> {
  const response = await apiClient.get<unknown>('/serials/batches', { signal });
  const parsed = serialBatchListDtoSchema.safeParse(response);

  if (!parsed.success) throw invalidResponse(parsed.error);

  return parsed.data.map(mapSerialBatch);
}

// The factory file is sent verbatim so validation (format, unknown model,
// duplicates) happens once on the server and the rejection report matches
// what a real batch ingest would return.
export async function ingestSerialBatch(input: {
  fileName: string;
  content: string;
}): Promise<SerialIngestResult> {
  const response = await apiClient.post<unknown>('/serials/batches', {
    file_name: input.fileName,
    content: input.content,
  });
  const parsed = serialIngestResultDtoSchema.safeParse(response);

  if (!parsed.success) throw invalidResponse(parsed.error);

  return {
    batchId: parsed.data.batch_id,
    inserted: parsed.data.inserted,
    rejected: parsed.data.rejected,
  };
}

export async function recallSerialBatch(input: {
  batchId: string;
  reason: string;
}): Promise<SerialBatch> {
  const response = await apiClient.post<unknown>(
    `/serials/batches/${input.batchId}/recall`,
    { reason: input.reason }
  );
  const parsed = serialBatchListDtoSchema.element.safeParse(response);

  if (!parsed.success) throw invalidResponse(parsed.error);

  return mapSerialBatch(parsed.data);
}
