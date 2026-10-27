import type {
  CoreLifecycleAuditEntryDto,
  CoreTypeDto,
  RegionInsight,
} from '@/features/serials/schemas/coreLifecycleSchemas';

// 9.3 core types as they stand today. Standards are illustrative, pending the
// official R&D table; `coreTypeHistory` below records how they got here, and
// the batch fixtures (./serials.ts) replay it to know which standard a core
// locked in when it was activated.
function coreType(
  code: string,
  name: string,
  group: string,
  usualPosition: string,
  hours: number,
  months: number,
  floor: number
): CoreTypeDto {
  return {
    code,
    name,
    group,
    usual_position: usualPosition,
    standard_months: months,
    standard_hours: hours,
    floor_percent: floor,
  };
}

// Filter hours and months of device operation, whichever runs out first.
export const coreTypeFixtures: readonly CoreTypeDto[] = [
  coreType('PP5', 'PP 5 micron', 'Lọc thô', 'Lõi 1', 250, 12, 40),
  coreType('GAC', 'Than hoạt tính GAC', 'Lọc tinh', 'Lõi 2', 500, 12, 40),
  coreType('PP1', 'PP 1 micron', 'Than hoạt tính', 'Lõi 3', 750, 12, 40),
  coreType('RO', 'Màng RO', 'Màng RO', 'Lõi 4', 2700, 36, 50),
  // Position 5 holds all three functional cores at once; each has its own
  // QR, batch and countdown, and R&D can tune each one separately.
  coreType(
    'MINERAL',
    'Mineral Purion',
    'Lõi chức năng sau RO',
    'Lõi 5 · 1/3',
    1000,
    12,
    60
  ),
  coreType(
    'HYDROGEN',
    'Hydrogen Purion',
    'Lõi chức năng sau RO',
    'Lõi 5 · 2/3',
    1000,
    12,
    60
  ),
  coreType(
    'PPNANO',
    'PP Nano Extra',
    'Lõi chức năng sau RO',
    'Lõi 5 · 3/3',
    1000,
    12,
    60
  ),
];

export interface CoreTypeChange {
  at: string;
  actor: string;
  code: string;
  field: 'standardMonths' | 'standardHours' | 'floorPercent';
  before: string;
  after: string;
  reason: string;
}

// Oldest first. `after` of the last change per field equals the value above.
export const coreTypeHistory: readonly CoreTypeChange[] = [
  {
    at: '2026-02-10T02:00:00.000Z',
    actor: 'admin@mock.cms-portal.local',
    code: 'PP5',
    field: 'floorPercent',
    before: '30',
    after: '40',
    reason: 'Thống nhất mức sàn nhóm lọc thô 40%',
  },
  {
    at: '2026-06-15T03:30:00.000Z',
    actor: 'factory@mock.cms-portal.local',
    code: 'GAC',
    field: 'standardHours',
    before: '450',
    after: '500',
    reason: 'Lõi lọc tinh thế hệ mới, R&D test đạt 500 giờ',
  },
  {
    at: '2026-08-02T07:30:00.000Z',
    actor: 'admin@mock.cms-portal.local',
    code: 'RO',
    field: 'floorPercent',
    before: '40',
    after: '50',
    reason: 'Màng RO giá cao, hạn chế rút ngắn quá mức',
  },
  {
    at: '2026-09-20T02:00:00.000Z',
    actor: 'factory@mock.cms-portal.local',
    code: 'HYDROGEN',
    field: 'standardHours',
    before: '800',
    after: '1000',
    reason: 'Điện cực thế hệ 2 kéo dài tuổi thọ lên 1000 giờ',
  },
];

// The standard a core type had at `at`: today's value with every later
// change rolled back.
export function standardAt(
  code: string,
  at: string
): { months: number; hours: number } {
  const core = coreTypeFixtures.find((item) => item.code === code)!;
  const standard = {
    months: core.standard_months,
    hours: core.standard_hours,
  };
  for (const change of [...coreTypeHistory].reverse()) {
    if (change.code !== code || change.at <= at) continue;
    if (change.field === 'standardMonths')
      standard.months = Number(change.before);
    if (change.field === 'standardHours')
      standard.hours = Number(change.before);
  }
  return standard;
}

export const coreTypeAuditFixtures: readonly CoreLifecycleAuditEntryDto[] =
  coreTypeHistory.map((change, index) => ({
    id: `core-type-audit-${index + 1}`,
    actor: change.actor,
    changed_at: change.at,
    target_kind: 'core_type',
    target: change.code,
    field: change.field,
    before_value: change.before,
    after_value: change.after,
    reason: change.reason,
  }));

// Reference data for the confirm-lifespan dialog (water map + QR history).
export const regionInsightFixtures: readonly {
  region: RegionInsight['region'];
  avg_tds_ppm: number;
  early_replace_percent: number;
}[] = [
  { region: 'north', avg_tds_ppm: 180, early_replace_percent: 12 },
  { region: 'central', avg_tds_ppm: 210, early_replace_percent: 15 },
  { region: 'south', avg_tds_ppm: 260, early_replace_percent: 18 },
  { region: 'nationwide', avg_tds_ppm: 235, early_replace_percent: 16 },
  { region: 'mekong_alum', avg_tds_ppm: 520, early_replace_percent: 34 },
  { region: 'hanoi', avg_tds_ppm: 230, early_replace_percent: 16 },
  { region: 'ho_chi_minh', avg_tds_ppm: 190, early_replace_percent: 14 },
];
