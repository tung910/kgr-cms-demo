import type { Device } from '../schemas/deviceSchemas';

// What the status column shows for one device. The list cell, the detail
// header and the CSV export all derive from this, so they cannot drift apart.
//
// Main status, checked in order:
//   non-IoT → "Không IoT" · IoT never connected to the cloud → "Chưa kích hoạt"
//   · otherwise Online / Offline. "Chưa kích hoạt" still counts as `offline`
//   for filters and counts.
// Tags, in display order:
//   decommissioned (everyone; hides the error tag) · locked (needs
//   device.control.read, §3.4c) · error (IoT device that is online and reports
//   a fault).
export type DeviceMainStatus =
  'nonIot' | 'neverActivated' | 'online' | 'offline';

export type DeviceStatusTag = 'decommissioned' | 'locked' | 'error';

export interface DeviceStatusDisplay {
  main: DeviceMainStatus;
  tags: DeviceStatusTag[];
}

type StatusSource = Pick<
  Device,
  'connectivity' | 'status' | 'hasError' | 'lastOnlineAt' | 'lifecycleState'
>;

export function getDeviceStatusDisplay(
  device: StatusSource,
  { canSeeLock }: { canSeeLock: boolean }
): DeviceStatusDisplay {
  const main: DeviceMainStatus =
    device.connectivity !== 'iot' || device.status === null
      ? 'nonIot'
      : device.lastOnlineAt === null
        ? 'neverActivated'
        : device.status;

  if (device.lifecycleState === 'decommissioned')
    return { main, tags: ['decommissioned'] };

  const tags: DeviceStatusTag[] = [];
  if (canSeeLock && device.lifecycleState === 'locked') tags.push('locked');
  if (main === 'online' && device.hasError) tags.push('error');
  return { main, tags };
}
