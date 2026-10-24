import { type CsvColumn, downloadCsv } from '@/shared/lib/csv';

import type { Device } from '../schemas/deviceSchemas';
import { getDeviceStatusDisplay } from './deviceStatusDisplay';

// The lock state is only exported to roles that can see it in the UI
// (device.control.read, §3.4c); everyone else gets `active` for locked units.
function buildColumns(canSeeLock: boolean): CsvColumn<Device>[] {
  const hasTag = (d: Device, tag: 'locked' | 'error') =>
    getDeviceStatusDisplay(d, { canSeeLock }).tags.includes(tag);

  return [
    { header: 'Serial', value: (d) => d.id },
    { header: 'Model', value: (d) => d.modelName },
    { header: 'Region', value: (d) => d.region },
    { header: 'Ward', value: (d) => d.ward ?? '' },
    { header: 'Status', value: (d) => d.status ?? '' },
    { header: 'Owner', value: (d) => d.owner?.name ?? d.owner?.id ?? '' },
    { header: 'Warranty status', value: (d) => d.warrantyStatus },
    {
      header: 'Lifecycle state',
      value: (d) =>
        d.lifecycleState === 'locked' && !hasTag(d, 'locked')
          ? 'active'
          : d.lifecycleState,
    },
    { header: 'Manufactured at', value: (d) => d.manufacturedAt },
    { header: 'Batch code', value: (d) => d.batchCode },
    {
      header: 'Wifi signal (dBm)',
      value: (d) => String(d.wifiSignalDbm ?? ''),
    },
    { header: 'Last online', value: (d) => d.lastOnlineAt ?? '' },
    { header: 'Activated at', value: (d) => d.activatedAt ?? '' },
    { header: 'Install address', value: (d) => d.installAddress },
    // Appended so existing column positions stay unchanged.
    { header: 'Product type', value: (d) => d.connectivity },
    { header: 'Has error', value: (d) => String(hasTag(d, 'error')) },
  ];
}

export function downloadDevicesCsv(
  devices: readonly Device[],
  { canSeeLock }: { canSeeLock: boolean }
): void {
  downloadCsv(devices, buildColumns(canSeeLock), 'devices');
}
