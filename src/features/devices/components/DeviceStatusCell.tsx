import { useTranslation } from 'react-i18next';

import { ConnectionStatusBadge } from '@/shared/components/ConnectionStatusBadge';
import { PortalBadge } from '@/shared/components/portal';

import type { Device } from '../schemas/deviceSchemas';
import {
  type DeviceMainStatus,
  type DeviceStatusTag,
  getDeviceStatusDisplay,
} from '../utils/deviceStatusDisplay';
import { useCanSeeLock } from '../utils/useCanSeeLock';

const TAG_TONES = {
  decommissioned: 'warning',
  locked: 'warning',
  error: 'danger',
} as const;

export function DeviceMainStatusBadge({ main }: { main: DeviceMainStatus }) {
  const { t } = useTranslation('devices');

  if (main === 'neverActivated') {
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-full border border-dashed border-[#B5B6B8] px-2.5 py-0.5 text-xs font-medium text-[#636466]">
        {t('statusCell.neverActivated')}
      </span>
    );
  }
  return <ConnectionStatusBadge status={main === 'nonIot' ? null : main} />;
}

export function DeviceStatusTags({ tags }: { tags: DeviceStatusTag[] }) {
  const { t } = useTranslation('devices');

  return (
    <>
      {tags.map((tag) => (
        <PortalBadge key={tag} tone={TAG_TONES[tag]}>
          {tag === 'error' ? t('statusCell.error') : t('lifecycleState.' + tag)}
        </PortalBadge>
      ))}
    </>
  );
}

// Status cell of the device list: one main status, then the tags. The rules
// live in getDeviceStatusDisplay and are shared with the detail header.
export function DeviceStatusCell({ device }: { device: Device }) {
  const canSeeLock = useCanSeeLock();
  const { main, tags } = getDeviceStatusDisplay(device, { canSeeLock });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <DeviceMainStatusBadge main={main} />
      <DeviceStatusTags tags={tags} />
    </div>
  );
}
