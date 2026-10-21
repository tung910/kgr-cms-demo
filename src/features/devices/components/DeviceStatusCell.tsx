import { useTranslation } from 'react-i18next';

import { useAuth } from '@/core/auth/useAuth';
import { hasCapability } from '@/core/permissions/capabilities';
import { ConnectionStatusBadge } from '@/shared/components/ConnectionStatusBadge';
import { PortalBadge } from '@/shared/components/portal';

import type { Device } from '../schemas/deviceSchemas';

// Status cell of the device list: one main status, then lifecycle tags.
// Main status, checked in order:
//   non-IoT → "Không IoT" · IoT never heard from → "Chưa kết nối" ·
//   otherwise the connection state (Online / Lỗi / Offline).
// "Chưa kết nối" is still `offline` for filters and counts.
// Lifecycle tags mirror the detail page: "Ngừng sử dụng" for everyone,
// "Đã khóa" only with device.control.read (§3.4c).
export function DeviceStatusCell({ device }: { device: Device }) {
  const { t } = useTranslation('devices');
  const { session } = useAuth();
  const canSeeLock = Boolean(
    session && hasCapability(session.role, 'device.control.read')
  );
  const neverConnected =
    device.connectivity === 'iot' && device.lastOnlineAt === null;
  const lifecycleTag =
    device.lifecycleState === 'decommissioned' ||
    (canSeeLock && device.lifecycleState === 'locked');

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {neverConnected ? (
        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-dashed border-[#B5B6B8] px-2.5 py-0.5 text-xs font-medium text-[#636466]">
          {t('statusCell.neverConnected')}
        </span>
      ) : (
        <ConnectionStatusBadge status={device.status} />
      )}
      {lifecycleTag ? (
        <PortalBadge tone="warning">
          {t('lifecycleState.' + device.lifecycleState)}
        </PortalBadge>
      ) : null}
    </div>
  );
}
