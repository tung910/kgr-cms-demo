import { type CsvColumn, downloadCsv } from '@/shared/lib/csv';

import type { MapRegion } from '../schemas/mapSchemas';

export interface MapReportLabels {
  headers: {
    region: string;
    level: string;
    devices: string;
    avgTds: string;
    status: string;
  };
  level: (region: MapRegion) => string;
  status: (region: MapRegion) => string;
}

// Regional aggregates only (spec §5.6): no customer or install-address data.
export function downloadMapReportCsv(
  regions: readonly MapRegion[],
  labels: MapReportLabels
): void {
  const columns: CsvColumn<MapRegion>[] = [
    { header: labels.headers.region, value: (r) => r.name },
    { header: labels.headers.level, value: labels.level },
    { header: labels.headers.devices, value: (r) => String(r.deviceCount) },
    { header: labels.headers.avgTds, value: (r) => String(r.avgTds) },
    { header: labels.headers.status, value: labels.status },
  ];
  downloadCsv(regions, columns, 'device-map-report');
}
