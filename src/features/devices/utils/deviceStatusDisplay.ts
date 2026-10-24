import type { Device } from '../schemas/deviceSchemas';

// What the status column shows for one device. The list cell, the detail
// header and the CSV export all derive from this, so they cannot drift apart.
//
// Main status, checked in order:
//   non-IoT → "Không IoT" · no owner → "Chưa có chủ" (e.g. the device was
//   reset to change owner) · otherwise Online / Offline. "Chưa có chủ" does not
//   change how the device is counted: filters and counts use the real
//   connection state.
// Tags, in display order:
//   decommissioned (everyone; hides the error tag) · locked (needs
//   device.control.read, §3.4c) · error (device that is really online and
//   reports a fault, even when the main status is "Chưa có chủ").
export type DeviceMainStatus = 'nonIot' | 'noOwner' | 'online' | 'offline';

export type DeviceStatusTag = 'decommissioned' | 'locked' | 'error';

export interface DeviceStatusDisplay {
  main: DeviceMainStatus;
  tags: DeviceStatusTag[];
}

type StatusSource = Pick<
  Device,
  'connectivity' | 'status' | 'hasError' | 'owner' | 'lifecycleState'
>;

export function getDeviceStatusDisplay(
  device: StatusSource,
  { canSeeLock }: { canSeeLock: boolean }
): DeviceStatusDisplay {
  const main: DeviceMainStatus =
    device.connectivity !== 'iot' || device.status === null
      ? 'nonIot'
      : device.owner === undefined
        ? 'noOwner'
        : device.status;

  if (device.lifecycleState === 'decommissioned')
    return { main, tags: ['decommissioned'] };

  const tags: DeviceStatusTag[] = [];
  if (canSeeLock && device.lifecycleState === 'locked') tags.push('locked');
  if (device.status === 'online' && device.hasError) tags.push('error');
  return { main, tags };
}
