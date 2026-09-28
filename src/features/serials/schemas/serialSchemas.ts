import { z } from 'zod';

// M04: one serial is one factory-issued pair of (serial, key). The key is the
// anti-counterfeit secret — the API never returns it in full, only masked.
export type SerialStatus = 'unused' | 'used' | 'recalled';

export interface Serial {
  serial: string;
  maskedKey: string;
  modelCode: string;
  batchId: string;
  status: SerialStatus;
  ingestedAt: string;
  usedAt: string | null;
  usedByDeviceId: string | null;
}

export interface SerialBatch {
  id: string;
  modelCode: string;
  total: number;
  used: number;
  ingestedAt: string;
  recalledAt: string | null;
  recallReason: string | null;
}

export interface SerialListFilters {
  search: string;
  modelCode?: string;
  batchId?: string;
  status?: SerialStatus;
  page: number;
  pageSize: number;
}

export type SerialIngestRejectionReason =
  | 'missingField'
  | 'invalidSerialFormat'
  | 'unknownModel'
  | 'duplicateInFile'
  | 'alreadyIngested';

export interface SerialIngestRejection {
  line: number;
  serial: string;
  reason: SerialIngestRejectionReason;
}

export interface SerialIngestResult {
  batchId: string;
  inserted: number;
  rejected: SerialIngestRejection[];
}

export const serialStatusSchema = z.enum(['unused', 'used', 'recalled']);

export const serialDtoSchema = z.object({
  serial: z.string().min(1),
  masked_key: z.string().min(1),
  model_code: z.string().min(1),
  batch_id: z.string().min(1),
  status: serialStatusSchema,
  ingested_at: z.string().datetime({ offset: true }),
  used_at: z.string().datetime({ offset: true }).nullable(),
  used_by_device_id: z.string().nullable(),
});

export const serialPageDtoSchema = z.object({
  items: z.array(serialDtoSchema),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});

export const serialBatchDtoSchema = z.object({
  batch_id: z.string().min(1),
  model_code: z.string().min(1),
  total: z.number().int().nonnegative(),
  used: z.number().int().nonnegative(),
  ingested_at: z.string().datetime({ offset: true }),
  recalled_at: z.string().datetime({ offset: true }).nullable(),
  recall_reason: z.string().nullable(),
});

export const serialBatchListDtoSchema = z.array(serialBatchDtoSchema);

export const serialIngestResultDtoSchema = z.object({
  batch_id: z.string().min(1),
  inserted: z.number().int().nonnegative(),
  rejected: z.array(
    z.object({
      line: z.number().int().positive(),
      serial: z.string(),
      reason: z.enum([
        'missingField',
        'invalidSerialFormat',
        'unknownModel',
        'duplicateInFile',
        'alreadyIngested',
      ]),
    })
  ),
});

export type SerialDto = z.infer<typeof serialDtoSchema>;
export type SerialBatchDto = z.infer<typeof serialBatchDtoSchema>;
