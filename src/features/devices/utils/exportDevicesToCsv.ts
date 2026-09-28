import { type CsvColumn, downloadCsv } from '@/shared/lib/csv';

import type { Device } from '../schemas/deviceSchemas';

const columns: CsvColumn<Device>[] = [
  { header: 'Serial', value: (d) => d.id },
  { header: 'Model', value: (d) => d.modelName },
  { header: 'Region', value: (d) => d.region },
  { header: 'Ward', value: (d) => d.ward ?? '' },
  { header: 'Status', value: (d) => d.status },
  { header: 'Owner', value: (d) => d.owner?.name ?? d.owner?.id ?? '' },
  { header: 'Warranty status', value: (d) => d.warrantyStatus },
  { header: 'Lifecycle state', value: (d) => d.lifecycleState },
  { header: 'Manufactured at', value: (d) => d.manufacturedAt },
  { header: 'Batch code', value: (d) => d.batchCode },
  { header: 'Wifi signal (dBm)', value: (d) => String(d.wifiSignalDbm ?? '') },
  { header: 'Last online', value: (d) => d.lastOnlineAt ?? '' },
  { header: 'Activated at', value: (d) => d.activatedAt ?? '' },
  { header: 'Install address', value: (d) => d.installAddress },
];

export function downloadDevicesCsv(devices: readonly Device[]): void {
  downloadCsv(devices, columns, 'devices');
}
