import { z } from 'zod';

import {
  DISTRIBUTION_REGION_VALUES,
  type DistributionRegion,
} from '@/shared/constants/distributionRegion';

// M04: one serial is the QR stamp of one genuine filter core, a pair of
// (serial, key). The key is the anti-counterfeit secret — the API never
// returns it in full, only masked.
export type SerialStatus = 'unused' | 'used' | 'recalled';

// A batch is "pending" until R&D/Admin confirms its lifespan for the declared
// distribution region; pending batches still activate on the standard.
export const BATCH_LIFESPAN_STATUSES = [
  { value: 'pending', labelKey: 'lifespanStatus.pending' },
  { value: 'confirmed', labelKey: 'lifespanStatus.confirmed' },
] as const;

export type BatchLifespanStatus =
  (typeof BATCH_LIFESPAN_STATUSES)[number]['value'];

export type LifespanSource = 'batch' | 'standard';

export interface LockedLifespan {
  months: number;
  hours: number;
  source: LifespanSource;
}

export interface Serial {
  serial: string;
  maskedKey: string;
  coreType: string;
  batchId: string;
  status: SerialStatus;
  ingestedAt: string;
  usedAt: string | null;
  usedByDeviceId: string | null;
  lockedLifespan: LockedLifespan | null;
}

export interface SerialBatch {
  id: string;
  coreType: string;
  region: DistributionRegion | null;
  lifespanStatus: BatchLifespanStatus;
  lifespanMonths: number | null;
  lifespanHours: number | null;
  total: number;
  used: number;
  ingestedAt: string;
  recalledAt: string | null;
  recallReason: string | null;
}

export interface SerialListFilters {
  search: string;
  coreType?: string;
  batchId?: string;
  status?: SerialStatus;
  page: number;
  pageSize: number;
}

export type SerialIngestRejectionReason =
  | 'missingField'
  | 'invalidSerialFormat'
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

export const lockedLifespanDtoSchema = z.object({
  months: z.number().int().positive(),
  hours: z.number().int().positive(),
  source: z.enum(['batch', 'standard']),
});

export const serialDtoSchema = z.object({
  serial: z.string().min(1),
  masked_key: z.string().min(1),
  core_type: z.string().min(1),
  batch_id: z.string().min(1),
  status: serialStatusSchema,
  ingested_at: z.string().datetime({ offset: true }),
  used_at: z.string().datetime({ offset: true }).nullable(),
  used_by_device_id: z.string().nullable(),
  locked_lifespan: lockedLifespanDtoSchema.nullable(),
});

export const serialPageDtoSchema = z.object({
  items: z.array(serialDtoSchema),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});

export const serialBatchDtoSchema = z.object({
  batch_id: z.string().min(1),
  core_type: z.string().min(1),
  region: z.enum(DISTRIBUTION_REGION_VALUES).nullable(),
  lifespan_status: z.enum(['pending', 'confirmed']),
  lifespan_months: z.number().int().positive().nullable(),
  lifespan_hours: z.number().int().positive().nullable(),
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
        'duplicateInFile',
        'alreadyIngested',
      ]),
    })
  ),
});

export type SerialDto = z.infer<typeof serialDtoSchema>;
export type SerialBatchDto = z.infer<typeof serialBatchDtoSchema>;
