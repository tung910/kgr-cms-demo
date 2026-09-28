import type {
  DashboardActiveDto,
  DashboardSummaryDto,
} from '@/features/dashboard/schemas/dashboardSchemas';

export const dashboardSummaryFixture: DashboardSummaryDto = {
  updated_at: '09:30, 17/09/2026',
  metrics: [
    {
      key: 'total',
      value: '18.432',
      trend: { direction: 'up', percent: '+2,4%', positive_is_good: true },
    },
    {
      key: 'error_rate',
      value: '1,8',
      unit: '%',
      trend: { direction: 'down', percent: '-0,6%', positive_is_good: false },
    },
    {
      key: 'tds',
      value: '38',
      unit: 'ppm',
      trend: { direction: 'down', percent: '-1,2%', positive_is_good: true },
    },
    {
      key: 'active',
      value: '12.907',
      unit: 'DAU',
      trend: { direction: 'up', percent: '+4,1%', positive_is_good: true },
    },
    {
      key: 'filters',
      value: '4.218',
      trend: { direction: 'up', percent: '+8,7%', positive_is_good: true },
    },
    {
      key: 'revenue',
      value: '2,1',
      unit: 'tỷ đ',
      trend: { direction: 'up', percent: '+6,3%', positive_is_good: true },
    },
  ],
  online_trend: Array.from({ length: 24 }, (_, hour) => ({
    label: `${String(hour).padStart(2, '0')}h`,
    online: 17_900 + ((hour * 137) % 600),
    offline: 380 + ((hour * 53) % 160),
  })),
  tds_by_region: [
    { region: 'Hà Nội', tds: 47 },
    { region: 'TP.HCM', tds: 51 },
    { region: 'Đà Nẵng', tds: 34 },
    { region: 'Hải Phòng', tds: 43 },
    { region: 'Cần Thơ', tds: 58 },
    { region: 'Bình Dương', tds: 56 },
  ],
  tds_threshold: 55,
  revenue_trend: [
    { label: 'T2', revenue: 280, filters: 10 },
    { label: 'T3', revenue: 340, filters: 12 },
    { label: 'T4', revenue: 300, filters: 11 },
    { label: 'T5', revenue: 380, filters: 13 },
    { label: 'T6', revenue: 420, filters: 14 },
    { label: 'T7', revenue: 460, filters: 15 },
  ],
};

// ponytail: the mock ignores from/to and always returns the latest periods;
// the backend applies the range.
const activeLabels: Record<DashboardActiveDto['granularity'], string[]> = {
  week: Array.from({ length: 12 }, (_, index) => `W${index + 27}`),
  month: Array.from({ length: 12 }, (_, index) => {
    const month = ((index + 9) % 12) + 1;
    const year = index < 3 ? 25 : 26;
    return `T${month}/${year}`;
  }),
  year: ['2022', '2023', '2024', '2025', '2026'],
};
const activeScale: Record<DashboardActiveDto['granularity'], number> = {
  week: 1,
  month: 4,
  year: 40,
};

export function buildDashboardActiveFixture(
  granularity: DashboardActiveDto['granularity']
): DashboardActiveDto {
  const scale = activeScale[granularity];
  return {
    granularity,
    points: activeLabels[granularity].map((label, index) => ({
      label,
      customers: Math.round((2_400 + index * 120 + (index % 3) * 90) * scale),
      devices: Math.round((3_100 + index * 150 + (index % 4) * 70) * scale),
    })),
  };
}
