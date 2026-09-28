import type {
  SerialBatchDto,
  SerialDto,
} from '@/features/serials/schemas/serialSchemas';

interface BatchSeed {
  batchId: string;
  modelCode: string;
  ingestedAt: string;
  size: number;
  usedCount: number;
  recalledAt?: string;
  recallReason?: string;
}

const batchSeeds: readonly BatchSeed[] = [
  {
    batchId: 'LOT-2026-01',
    modelCode: 'KGR-A100',
    ingestedAt: '2026-01-15T02:00:00.000Z',
    size: 40,
    usedCount: 31,
  },
  {
    batchId: 'LOT-2026-02',
    modelCode: 'KGR-A100',
    ingestedAt: '2026-04-02T02:00:00.000Z',
    size: 40,
    usedCount: 12,
  },
  {
    batchId: 'LOT-2026-03',
    modelCode: 'KGR-B200',
    ingestedAt: '2026-05-20T02:00:00.000Z',
    size: 30,
    usedCount: 18,
  },
  {
    batchId: 'LOT-2026-04',
    modelCode: 'KGR-B200',
    ingestedAt: '2026-07-08T02:00:00.000Z',
    size: 30,
    usedCount: 4,
    recalledAt: '2026-08-11T09:30:00.000Z',
    recallReason: 'Rò rỉ dải mã in tại nhà in đối tác.',
  },
  {
    batchId: 'LOT-2026-05',
    modelCode: 'KGR-C300',
    ingestedAt: '2026-08-25T02:00:00.000Z',
    size: 25,
    usedCount: 6,
  },
];

// Deterministic so the fixture set is stable between reloads.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function code(seed: number, length: number): string {
  let value = seed * 2654435761;
  let result = '';
  for (let index = 0; index < length; index += 1) {
    value = (value * 1103515245 + 12345) & 0x7fffffff;
    result += CODE_ALPHABET[value % CODE_ALPHABET.length];
  }
  return result;
}

function buildBatch(seed: BatchSeed, batchIndex: number): SerialDto[] {
  return Array.from({ length: seed.size }, (_, index) => {
    const used = index < seed.usedCount;
    const offsetDays = index + 1;
    return {
      serial: `${seed.modelCode}-${code(batchIndex * 1000 + index, 6)}`,
      masked_key: `${code(batchIndex * 7919 + index, 2)}••••••`,
      model_code: seed.modelCode,
      batch_id: seed.batchId,
      status: seed.recalledAt ? 'recalled' : used ? 'used' : 'unused',
      ingested_at: seed.ingestedAt,
      used_at: used
        ? new Date(
            new Date(seed.ingestedAt).getTime() + offsetDays * 86_400_000
          ).toISOString()
        : null,
      used_by_device_id: used ? `DEV-${code(batchIndex + index, 8)}` : null,
    } satisfies SerialDto;
  });
}

export const serialBatchFixtures: readonly SerialBatchDto[] = batchSeeds.map(
  (seed) => ({
    batch_id: seed.batchId,
    model_code: seed.modelCode,
    total: seed.size,
    used: seed.usedCount,
    ingested_at: seed.ingestedAt,
    recalled_at: seed.recalledAt ?? null,
    recall_reason: seed.recallReason ?? null,
  })
);

export const serialFixtures: readonly SerialDto[] =
  batchSeeds.flatMap(buildBatch);
