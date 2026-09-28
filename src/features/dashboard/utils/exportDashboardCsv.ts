import { downloadCsv } from '@/shared/lib/csv';

import type {
  ActiveGranularity,
  DashboardActivePoint,
  DashboardRegionTds,
  DashboardRevenuePoint,
} from '../schemas/dashboardSchemas';

export function downloadTdsCsv(
  regions: readonly DashboardRegionTds[],
  threshold: number
): void {
  downloadCsv(
    regions,
    [
      { header: 'Region', value: (row) => row.region },
      { header: 'Average TDS (ppm)', value: (row) => String(row.tds) },
      {
        header: `Above threshold (${threshold} ppm)`,
        value: (row) => (row.tds > threshold ? 'yes' : 'no'),
      },
    ],
    'dashboard-tds'
  );
}

export function downloadRevenueCsv(
  points: readonly DashboardRevenuePoint[]
): void {
  downloadCsv(
    points,
    [
      { header: 'Month', value: (row) => row.label },
      { header: 'Revenue', value: (row) => String(row.revenue) },
      { header: 'Filters sold', value: (row) => String(row.filters) },
    ],
    'dashboard-filter-revenue'
  );
}

export function downloadActiveCsv(
  points: readonly DashboardActivePoint[],
  granularity: ActiveGranularity
): void {
  downloadCsv(
    points,
    [
      { header: 'Period', value: (row) => row.label },
      { header: 'Active customers', value: (row) => String(row.customers) },
      { header: 'Active devices', value: (row) => String(row.devices) },
    ],
    `dashboard-active-${granularity}`
  );
}
