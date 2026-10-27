import type { CoreLifecycleAuditEntryDto } from '@/features/serials/schemas/coreLifecycleSchemas';
import type {
  SerialBatchDto,
  SerialDto,
} from '@/features/serials/schemas/serialSchemas';
import type { DistributionRegion } from '@/shared/constants/distributionRegion';

import { standardAt } from './coreLifecycleConfigs';

// Each batch is a timeline (ingest → region → confirm → adjust → recall).
// The batch table, the 9.3 change log and every serial's locked lifespan are
// all derived from it, so the three views always agree: a core activated
// before a confirmation keeps the standard of that day, one activated after
// an adjustment keeps the adjusted value (no retroactivity).

const FACTORY = 'factory@mock.cms-portal.local';
const LOGISTICS = 'logistics@mock.cms-portal.local';
const ADMIN = 'admin@mock.cms-portal.local';
// Activations in the fixture run up to this point in time.
const FIXTURE_NOW = '2026-10-26T10:00:00.000Z';

interface LifespanEvent {
  at: string;
  actor: string;
  months: number;
  hours: number;
  reason: string;
}

interface BatchSeed {
  batchId: string;
  coreType: string;
  ingestedAt: string;
  ingestedBy: string;
  size: number;
  usedCount: number;
  region?: {
    at: string;
    actor: string;
    value: DistributionRegion;
    reason: string;
  };
  // The first event confirms the batch, later ones adjust it.
  lifespan?: LifespanEvent[];
  recall?: { at: string; reason: string };
}

const batchSeeds: readonly BatchSeed[] = [
  {
    batchId: 'QR-B0101',
    coreType: 'PP5',
    ingestedAt: '2026-01-15T02:00:00.000Z',
    ingestedBy: FACTORY,
    size: 40,
    usedCount: 31,
    region: {
      at: '2026-01-18T03:00:00.000Z',
      actor: LOGISTICS,
      value: 'north',
      reason: 'Phân phối theo lệnh xuất kho XK-0118',
    },
    lifespan: [
      {
        at: '2026-01-20T02:00:00.000Z',
        actor: FACTORY,
        months: 12,
        hours: 250,
        reason: '',
      },
    ],
  },
  {
    batchId: 'QR-B0106',
    coreType: 'RO',
    ingestedAt: '2026-03-01T02:00:00.000Z',
    ingestedBy: FACTORY,
    size: 30,
    usedCount: 15,
    region: {
      at: '2026-03-02T02:00:00.000Z',
      actor: LOGISTICS,
      value: 'nationwide',
      reason: 'Phân phối theo lệnh xuất kho XK-0302',
    },
    lifespan: [
      {
        at: '2026-03-03T02:00:00.000Z',
        actor: ADMIN,
        months: 36,
        hours: 2700,
        reason: '',
      },
    ],
  },
  {
    // Confirmed late: cores scanned before 12/09 keep the 12 months · 250 h
    // standard.
    batchId: 'QR-B0102',
    coreType: 'PP5',
    ingestedAt: '2026-04-02T02:00:00.000Z',
    ingestedBy: FACTORY,
    size: 40,
    usedCount: 22,
    region: {
      at: '2026-04-03T03:05:00.000Z',
      actor: LOGISTICS,
      value: 'mekong_alum',
      reason: 'Phân phối theo lệnh xuất kho XK-0304',
    },
    lifespan: [
      {
        at: '2026-09-12T02:14:00.000Z',
        actor: FACTORY,
        months: 8,
        hours: 170,
        reason: 'Lô cho ĐBSCL: TDS đầu vào TB 520 ppm, khách thay sớm ~34%',
      },
    ],
  },
  {
    // Confirmed at the old 450 h GAC standard; the 06/15 standard change to
    // 500 h does not touch it, so it now reads 90%.
    batchId: 'QR-B0103',
    coreType: 'GAC',
    ingestedAt: '2026-05-20T02:00:00.000Z',
    ingestedBy: FACTORY,
    size: 30,
    usedCount: 18,
    region: {
      at: '2026-05-22T02:00:00.000Z',
      actor: LOGISTICS,
      value: 'south',
      reason: 'Phân phối theo lệnh xuất kho XK-0522',
    },
    lifespan: [
      {
        at: '2026-05-25T02:00:00.000Z',
        actor: FACTORY,
        months: 12,
        hours: 450,
        reason: '',
      },
    ],
  },
  {
    // Adjusted after field feedback: early cores keep 1000 h, later 800 h.
    batchId: 'QR-B0107',
    coreType: 'MINERAL',
    ingestedAt: '2026-06-01T02:00:00.000Z',
    ingestedBy: FACTORY,
    size: 30,
    usedCount: 18,
    region: {
      at: '2026-06-02T02:00:00.000Z',
      actor: LOGISTICS,
      value: 'north',
      reason: 'Phân phối theo lệnh xuất kho XK-0602',
    },
    lifespan: [
      {
        at: '2026-06-03T02:00:00.000Z',
        actor: FACTORY,
        months: 12,
        hours: 1000,
        reason: '',
      },
      {
        at: '2026-09-01T02:00:00.000Z',
        actor: FACTORY,
        months: 10,
        hours: 800,
        reason:
          'TT DV phản hồi khoáng hoá giảm sớm ở Miền Bắc, rút còn 800 giờ',
      },
    ],
  },
  {
    batchId: 'QR-B0104',
    coreType: 'PP1',
    ingestedAt: '2026-07-08T02:00:00.000Z',
    ingestedBy: FACTORY,
    size: 30,
    usedCount: 4,
    region: {
      at: '2026-07-09T02:00:00.000Z',
      actor: LOGISTICS,
      value: 'central',
      reason: 'Phân phối theo lệnh xuất kho XK-0709',
    },
    lifespan: [
      {
        at: '2026-07-10T02:00:00.000Z',
        actor: FACTORY,
        months: 12,
        hours: 750,
        reason: '',
      },
    ],
    recall: {
      at: '2026-08-11T09:30:00.000Z',
      reason: 'Rò rỉ dải mã in tại nhà in đối tác.',
    },
  },
  {
    // Pending across the 09/20 Hydrogen standard change (800 → 1000 h).
    batchId: 'QR-B0108',
    coreType: 'HYDROGEN',
    ingestedAt: '2026-08-10T02:00:00.000Z',
    ingestedBy: FACTORY,
    size: 25,
    usedCount: 14,
    region: {
      at: '2026-08-12T02:00:00.000Z',
      actor: LOGISTICS,
      value: 'south',
      reason: 'Phân phối theo lệnh xuất kho XK-0812',
    },
    lifespan: [
      {
        at: '2026-09-25T02:00:00.000Z',
        actor: FACTORY,
        months: 12,
        hours: 1000,
        reason: '',
      },
    ],
  },
  {
    // Still waiting for logistics: no region yet, runs on the standard.
    batchId: 'QR-B0105',
    coreType: 'RO',
    ingestedAt: '2026-08-25T02:00:00.000Z',
    ingestedBy: FACTORY,
    size: 25,
    usedCount: 6,
  },
  {
    batchId: 'QR-B0112',
    coreType: 'PP1',
    ingestedAt: '2026-09-05T02:00:00.000Z',
    ingestedBy: FACTORY,
    size: 30,
    usedCount: 9,
    region: {
      at: '2026-09-06T02:00:00.000Z',
      actor: LOGISTICS,
      value: 'south',
      reason: 'Phân phối theo lệnh xuất kho XK-0906',
    },
    lifespan: [
      {
        at: '2026-09-08T02:00:00.000Z',
        actor: FACTORY,
        months: 11,
        hours: 650,
        reason: 'Nước giếng khoan Miền Nam, TDS TB 260 ppm',
      },
    ],
  },
  {
    // Region declared at ingest by logistics; waiting for R&D. QR-B0102 is
    // the reference batch (same core type and region).
    batchId: 'QR-B0109',
    coreType: 'PP5',
    ingestedAt: '2026-10-08T02:00:00.000Z',
    ingestedBy: LOGISTICS,
    size: 30,
    usedCount: 3,
    region: {
      at: '2026-10-08T02:00:00.000Z',
      actor: LOGISTICS,
      value: 'mekong_alum',
      reason: 'Khai báo khi nhập lô',
    },
  },
  {
    batchId: 'QR-B0111',
    coreType: 'PPNANO',
    ingestedAt: '2026-10-12T02:00:00.000Z',
    ingestedBy: FACTORY,
    size: 20,
    usedCount: 0,
  },
  {
    batchId: 'QR-B0110',
    coreType: 'GAC',
    ingestedAt: '2026-10-15T02:00:00.000Z',
    ingestedBy: FACTORY,
    size: 30,
    usedCount: 0,
    region: {
      at: '2026-10-16T02:00:00.000Z',
      actor: LOGISTICS,
      value: 'north',
      reason: 'Phân phối theo lệnh xuất kho XK-1016',
    },
  },
];

// Deterministic so the fixture set is stable between reloads.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function code(seed: number, length: number): string {
  // Math.imul keeps the LCG in 32-bit integers (plain `*` overflowed past
  // 2^53), and the high bits are used because the low ones cycle quickly.
  let value = Math.imul(seed + 1, 2654435761);
  let result = '';
  for (let index = 0; index < length; index += 1) {
    value = (Math.imul(value, 1103515245) + 12345) & 0x7fffffff;
    result += CODE_ALPHABET[(value >>> 16) % CODE_ALPHABET.length];
  }
  return result;
}

// Two characters from the row index keep codes unique within a batch.
function indexSuffix(index: number): string {
  const size = CODE_ALPHABET.length;
  return (
    CODE_ALPHABET[Math.floor(index / size) % size]! +
    CODE_ALPHABET[index % size]
  );
}

// Activations spread evenly from ingest to recall (or the fixture "now").
function activationTimes(seed: BatchSeed): string[] {
  const start = new Date(seed.ingestedAt).getTime();
  const end = new Date(seed.recall?.at ?? FIXTURE_NOW).getTime();
  const step = (end - start) / (seed.usedCount + 1);
  return Array.from({ length: seed.usedCount }, (_, index) =>
    new Date(Math.round(start + step * (index + 1))).toISOString()
  );
}

function lockedAt(
  seed: BatchSeed,
  at: string
): NonNullable<SerialDto['locked_lifespan']> {
  const event = seed.lifespan?.filter((item) => item.at <= at).at(-1);
  return event
    ? { months: event.months, hours: event.hours, source: 'batch' }
    : { ...standardAt(seed.coreType, at), source: 'standard' };
}

function buildBatch(seed: BatchSeed, batchIndex: number): SerialDto[] {
  const usedAt = activationTimes(seed);
  return Array.from({ length: seed.size }, (_, index) => {
    const activatedAt = usedAt[index];
    return {
      serial: `KGR-${seed.batchId.slice(-4)}-${code(batchIndex * 1000 + index, 4)}${indexSuffix(index)}`,
      masked_key: `${code(batchIndex * 7919 + index, 2)}••••••`,
      core_type: seed.coreType,
      batch_id: seed.batchId,
      status: seed.recall ? 'recalled' : activatedAt ? 'used' : 'unused',
      ingested_at: seed.ingestedAt,
      used_at: activatedAt ?? null,
      used_by_device_id: activatedAt
        ? `DEV-${code(batchIndex + index, 8)}`
        : null,
      locked_lifespan: activatedAt ? lockedAt(seed, activatedAt) : null,
    } satisfies SerialDto;
  });
}

function batchAudit(seed: BatchSeed): CoreLifecycleAuditEntryDto[] {
  const entries: Array<
    Omit<CoreLifecycleAuditEntryDto, 'id' | 'target_kind' | 'target'>
  > = [
    {
      actor: seed.ingestedBy,
      changed_at: seed.ingestedAt,
      field: 'batchCreated',
      before_value: '',
      after_value: `${seed.coreType} · ${seed.size}`,
      reason: '',
    },
  ];
  if (seed.region)
    entries.push({
      actor: seed.region.actor,
      changed_at: seed.region.at,
      field: 'region',
      before_value: '',
      after_value: seed.region.value,
      reason: seed.region.reason,
    });
  seed.lifespan?.forEach((event, index) => {
    const before =
      index === 0
        ? standardAt(seed.coreType, event.at)
        : seed.lifespan![index - 1]!;
    const common = {
      actor: event.actor,
      changed_at: event.at,
      reason: event.reason,
    };
    if (index === 0)
      entries.push({
        ...common,
        field: 'lifespanStatus',
        before_value: 'pending',
        after_value: 'confirmed',
      });
    if (event.months !== before.months)
      entries.push({
        ...common,
        field: 'lifespanMonths',
        before_value: String(before.months),
        after_value: String(event.months),
      });
    if (event.hours !== before.hours)
      entries.push({
        ...common,
        field: 'lifespanHours',
        before_value: String(before.hours),
        after_value: String(event.hours),
      });
  });
  return entries.map((entry, index) => ({
    ...entry,
    id: `batch-audit-${seed.batchId}-${index + 1}`,
    target_kind: 'batch',
    target: seed.batchId,
  }));
}

// Newest batch first, like a freshly ingested one in the mock store.
export const serialBatchFixtures: readonly SerialBatchDto[] = [...batchSeeds]
  .sort((a, b) => b.ingestedAt.localeCompare(a.ingestedAt))
  .map((seed) => {
    const latest = seed.lifespan?.at(-1);
    return {
      batch_id: seed.batchId,
      core_type: seed.coreType,
      region: seed.region?.value ?? null,
      lifespan_status: latest ? 'confirmed' : 'pending',
      lifespan_months: latest?.months ?? null,
      lifespan_hours: latest?.hours ?? null,
      total: seed.size,
      used: seed.usedCount,
      ingested_at: seed.ingestedAt,
      recalled_at: seed.recall?.at ?? null,
      recall_reason: seed.recall?.reason ?? null,
    };
  });

export const serialFixtures: readonly SerialDto[] =
  batchSeeds.flatMap(buildBatch);

export const batchAuditFixtures: readonly CoreLifecycleAuditEntryDto[] =
  batchSeeds.flatMap(batchAudit);
